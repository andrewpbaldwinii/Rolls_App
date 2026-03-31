import { supabase } from '../lib/supabase';

/**
 * Send print order via Supabase Edge Function + Resend (see supabase/functions/send-print-order).
 * @returns {Promise<{ sent: boolean, useMailto?: boolean, errorMessage?: string }>}
 */
export async function sendPrintOrderEmail({ subject, text, rollId }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-print-order', {
      body: { subject, text, rollId: rollId ?? '' },
    });

    if (error) {
      console.warn('send-print-order:', error.message);
      return { sent: false, useMailto: true, errorMessage: error.message };
    }

    if (data?.ok) {
      return { sent: true };
    }

    if (data?.useMailto) {
      return { sent: false, useMailto: true };
    }

    return {
      sent: false,
      useMailto: true,
      errorMessage: data?.error || 'Unknown response',
    };
  } catch (e) {
    console.warn('send-print-order:', e);
    return { sent: false, useMailto: true, errorMessage: e?.message };
  }
}
