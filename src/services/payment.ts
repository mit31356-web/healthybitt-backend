import { supabase } from '../supabaseClient';

export interface TestCheckoutResult {
  success: boolean;
  paymentSessionId?: string;
  orderId?: string;
  error?: string;
}

/**
 * Initiates a Cashfree checkout session with a hardcoded amount of 300 for testing.
 * 
 * @param customerId The user ID representing the customer.
 * @param userEmail Optional customer email for receipt mapping.
 * @param userPhone Optional customer 10-digit phone number.
 * @returns Promise resolving to a TestCheckoutResult structure.
 */
export async function initiateTestCheckout(
  customerId: string,
  userEmail?: string,
  userPhone?: string
): Promise<TestCheckoutResult> {
  try {
    const { data, error } = await supabase.functions.invoke('cashfree-payment', {
      body: {
        order_amount: 300,
        customer_id: customerId,
        userEmail: userEmail || 'guest@healthybit.app',
        userPhone: userPhone || '9999999999'
      }
    });

    if (error) {
      console.error('[initiateTestCheckout] Function invocation error:', error);
      return {
        success: false,
        error: error.message || 'Edge Function failed to respond'
      };
    }

    if (!data || !data.success) {
      console.error('[initiateTestCheckout] API returned failure:', data);
      return {
        success: false,
        error: data?.error || 'Payment initiation failed on gateway server'
      };
    }

    const paymentSessionId = data.payment_session_id || data.paymentSessionId;
    const orderId = data.order_id || data.orderId;

    if (!paymentSessionId) {
      console.error('[initiateTestCheckout] Missing paymentSessionId in response:', data);
      return {
        success: false,
        error: 'No payment session ID returned from the server'
      };
    }

    return {
      success: true,
      paymentSessionId,
      orderId
    };
  } catch (err: any) {
    console.error('[initiateTestCheckout] Unexpected error:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while contacting the gateway'
    };
  }
}
