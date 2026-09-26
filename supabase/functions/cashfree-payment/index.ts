import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Read Cashfree keys from Deno environment variables
    let appId = Deno.env.get("CASHFREE_CLIENT_ID");
    let secretKey = Deno.env.get("CASHFREE_CLIENT_SECRET");
    let env = Deno.env.get("CASHFREE_ENV") || "sandbox";

    // 2. Fall back to reading from public.hb_secrets if environment variables are not set
    if (!appId || !secretKey) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: secrets } = await supabase
          .from("hb_secrets")
          .select("key_name, key_value");

        if (secrets) {
          const secretMap = new Map(secrets.map((s: any) => [s.key_name, s.key_value]));
          appId = appId || secretMap.get("cashfree_app_id");
          secretKey = secretKey || secretMap.get("cashfree_secret_key");
          env = Deno.env.get("CASHFREE_ENV") || secretMap.get("cashfree_env") || "sandbox";
        }
      } catch (dbErr) {
        console.warn("[cashfree-payment] Failed to load backup keys from database secrets:", dbErr);
      }
    }

    if (!appId || !secretKey) {
      throw new Error("Cashfree credentials (CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET) are not configured in environment variables or hb_secrets.");
    }

    const baseUrl = env === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

    const body = await req.json();
    const { action } = body;

    // --- CHECK TRANSACTION STATUS ACTION (for frontend verification) ---
    if (action === 'check-status') {
      const { orderId } = body;
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing required parameter: orderId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Checking Cashfree status for order ${orderId} via ${baseUrl}/orders/${orderId}`);

      const orderRes = await fetch(`${baseUrl}/orders/${orderId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": appId,
          "x-client-secret": secretKey
        }
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        throw new Error(`Cashfree Order API error (${orderRes.status}): ${errText}`);
      }

      const orderData = await orderRes.json();
      console.log(`Cashfree order status response for ${orderId}:`, JSON.stringify(orderData));

      let paymentId = null;
      let errorCode = null;
      let errorDescription = null;

      try {
        const paymentsRes = await fetch(`${baseUrl}/orders/${orderId}/payments`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": appId,
            "x-client-secret": secretKey
          }
        });
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          if (Array.isArray(paymentsData) && paymentsData.length > 0) {
            const successPay = paymentsData.find((p: any) => p.payment_status === "SUCCESS");
            if (successPay) {
              paymentId = successPay.cf_payment_id ? String(successPay.cf_payment_id) : null;
            } else {
              const failedPay = paymentsData.find((p: any) => p.payment_status === "FAILED") || 
                                paymentsData.find((p: any) => p.payment_status === "USER_DROPPED") || 
                                paymentsData[0];
              if (failedPay) {
                paymentId = failedPay.cf_payment_id ? String(failedPay.cf_payment_id) : null;
                if (failedPay.error_details) {
                  errorCode = failedPay.error_details.error_code || null;
                  errorDescription = failedPay.error_details.error_description || null;
                }
                // Fallback for missing error_details on failure or user drop
                if (!errorCode && (failedPay.payment_status === "FAILED" || failedPay.payment_status === "USER_DROPPED")) {
                  errorCode = failedPay.payment_status === "USER_DROPPED" ? "USER_DROPPED" : "PAYMENT_FAILED";
                  errorDescription = failedPay.payment_status === "USER_DROPPED" ? "User dropped the payment session" : "Payment attempt failed";
                }
              }
            }
          }
        }
      } catch (payErr) {
        console.warn("Failed to retrieve individual payment attempts (non-critical):", payErr);
      }

      if (orderData.order_status === "PAID") {
        // --- ACTIVATE PREMIUM SECURELY ON BACKEND ---
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
          const supabaseClientInstance = createClient(supabaseUrl, serviceRoleKey);

          const customerId = orderData.customer_details?.customer_id;
          const amount = parseFloat(orderData.order_amount || "0");
          const plan = amount >= 1000 ? "yearly" : "monthly";

          if (customerId) {
            const expiryDate = new Date();
            if (plan === "monthly") {
              expiryDate.setMonth(expiryDate.getMonth() + 1);
            } else {
              expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            }

            console.log(`[Backend] Activating premium for user: ${customerId}, plan: ${plan}, expires: ${expiryDate.toISOString()}`);

            // 1. Update Profile (Bypasses RLS using Service Role Key)
            const { error: profileError } = await supabaseClientInstance
              .from("hb_profiles")
              .update({
                is_premium: true,
                premium_until: expiryDate.toISOString()
              })
              .eq("id", customerId);

            if (profileError) {
              console.error("[Backend] Error updating user profile:", profileError);
            }

            // 2. Insert/Log payment details to hb_payments table if not already present
            const { data: existingPayment } = await supabaseClientInstance
              .from("hb_payments")
              .select("id")
              .eq("cashfree_order_id", orderId)
              .maybeSingle();

            if (!existingPayment) {
              const { error: paymentError } = await supabaseClientInstance
                .from("hb_payments")
                .insert({
                  user_id: customerId,
                  cashfree_order_id: orderId,
                  cashfree_payment_id: paymentId,
                  plan: plan,
                  amount_inr: Math.round(amount),
                  status: "success",
                  premium_from: new Date().toISOString(),
                  premium_until: expiryDate.toISOString(),
                  user_email: orderData.customer_details?.customer_email || "",
                  user_name: ""
                });

              if (paymentError) {
                console.error("[Backend] Error logging payment:", paymentError);
              } else {
                console.log("[Backend] Logged payment record successfully");
              }
            } else {
              console.log("[Backend] Payment record already exists for order:", orderId);
            }
          } else {
            console.error("[Backend] Missing customer_id in order details");
          }
        } catch (dbErr) {
          console.error("[Backend] Error executing backend premium activation:", dbErr);
        }
      } else {
        // --- REVOKE PREMIUM / LOG FAILED OR PENDING PAYMENT ON BACKEND ---
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
          const supabaseClientInstance = createClient(supabaseUrl, serviceRoleKey);

          const customerId = orderData.customer_details?.customer_id;
          const amount = parseFloat(orderData.order_amount || "0");
          const plan = amount >= 1000 ? "yearly" : "monthly";
          const cfStatus = orderData.order_status; // 'ACTIVE', 'FAILED', 'EXPIRED', 'CANCELLED', etc.
          const dbStatus = cfStatus === "ACTIVE" ? "pending" : "failed";

          if (customerId) {
            console.log(`[Backend] Revoking premium/logging failed payment for user: ${customerId}, status: ${dbStatus} (Cashfree: ${cfStatus})`);

             // 1. Revoke Premium in Profile (Bypasses RLS using Service Role Key) only if they don't have a future subscription
            const { data: currentProfile } = await supabaseClientInstance
              .from("hb_profiles")
              .select("is_premium, premium_until")
              .eq("id", customerId)
              .maybeSingle();

            const isAlreadyActive = currentProfile?.is_premium && 
                                    currentProfile?.premium_until && 
                                    (new Date(currentProfile.premium_until) > new Date());

            if (!isAlreadyActive) {
              console.log(`[Backend] Revoking premium for user: ${customerId} (no future active premium found).`);
              const { error: profileError } = await supabaseClientInstance
                .from("hb_profiles")
                .update({
                  is_premium: false,
                  premium_until: null
                })
                .eq("id", customerId);

              if (profileError) {
                console.error("[Backend] Error revoking user profile premium:", profileError);
              }
            } else {
              console.log(`[Backend] User ${customerId} has another active premium until ${currentProfile?.premium_until}, preserving premium status.`);
            }

            // 2. Insert/Log failed/pending payment details to hb_payments table if not already present
            const { data: existingPayment } = await supabaseClientInstance
              .from("hb_payments")
              .select("id, status")
              .eq("cashfree_order_id", orderId)
              .maybeSingle();

            if (!existingPayment) {
              const { error: paymentError } = await supabaseClientInstance
                .from("hb_payments")
                .insert({
                  user_id: customerId,
                  cashfree_order_id: orderId,
                  cashfree_payment_id: null,
                  plan: plan,
                  amount_inr: Math.round(amount),
                  status: dbStatus,
                  premium_from: null,
                  premium_until: null,
                  user_email: orderData.customer_details?.customer_email || "",
                  user_name: ""
                });

              if (paymentError) {
                console.error("[Backend] Error logging failed/pending payment:", paymentError);
              } else {
                console.log("[Backend] Logged failed/pending payment record successfully");
              }
            } else if (existingPayment.status !== dbStatus) {
              // Update status of payment if it changed (e.g. from pending to failed)
              const { error: updateError } = await supabaseClientInstance
                .from("hb_payments")
                .update({ status: dbStatus })
                .eq("cashfree_order_id", orderId);

              if (updateError) {
                console.error("[Backend] Error updating payment status:", updateError);
              } else {
                console.log(`[Backend] Updated payment status to ${dbStatus} for order ${orderId}`);
              }
            }

            // 3. Log to hb_declined_payments table (Specifically for failed/declined transactions)
            if (dbStatus === "failed" || errorCode !== null) {
              const { data: existingDeclined } = await supabaseClientInstance
                .from("hb_declined_payments")
                .select("id")
                .eq("cashfree_order_id", orderId)
                .maybeSingle();

              if (!existingDeclined) {
                const { error: declinedError } = await supabaseClientInstance
                  .from("hb_declined_payments")
                  .insert({
                    user_id: customerId,
                    cashfree_order_id: orderId,
                    plan: plan,
                    amount_inr: Math.round(amount),
                    error_code: errorCode || "PAYMENT_FAILED",
                    error_description: errorDescription || "Payment was declined or cancelled",
                    user_email: orderData.customer_details?.customer_email || ""
                  });

                if (declinedError) {
                  console.error("[Backend] Error logging to hb_declined_payments:", declinedError);
                } else {
                  console.log("[Backend] Logged record to hb_declined_payments successfully");
                }
              }
            }
          }
        } catch (dbErr) {
          console.error("[Backend] Error executing backend failed payment update:", dbErr);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        orderId: orderData.order_id,
        orderStatus: orderData.order_status,
        paid: orderData.order_status === "PAID",
        paymentId: paymentId
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ORDER INITIATION ACTION (DEFAULT) ---
    // Support both user's simplified variables and existing frontend variables
    const amount = body.order_amount || body.amount;
    const userId = body.customer_id || body.userId;
    const redirectUrlOrigin = body.redirectUrlOrigin || "http://localhost:5173";
    const userPhone = body.userPhone || "9999999999";
    const userEmail = body.userEmail || "guest@healthybit.app";
    const plan = body.plan || "yearly";

    if (!amount || !userId) {
      return new Response(JSON.stringify({ error: "Missing required parameters: order_amount (or amount) and customer_id (or userId)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique order ID
    const orderId = "HB_ORD_" + Date.now() + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Prepare redirect URL with return parameters
    const returnUrl = `${redirectUrlOrigin}?order_id={order_id}&plan=${plan}`;

    const payload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_phone: userPhone.replace(/\D/g, '').slice(-10) || "9999999999",
        customer_email: userEmail
      },
      order_meta: {
        return_url: returnUrl
      }
    };

    console.log(`Creating Cashfree order ${orderId} via ${baseUrl}/orders`);

    const cfRes = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey
      },
      body: JSON.stringify(payload)
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok) {
      throw new Error(`Cashfree API responded with error: ${cfData.message || cfRes.statusText}`);
    }

    // Success response - returns both required and backward compatible fields
    return new Response(JSON.stringify({
      success: true,
      orderId: orderId,
      order_id: orderId,
      paymentSessionId: cfData.payment_session_id,
      payment_session_id: cfData.payment_session_id,
      orderAmount: cfData.order_amount,
      orderStatus: cfData.order_status
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[cashfree-payment] Error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
