import type { Handler } from '@netlify/functions';
import { supabase } from './_shared/supabase';

export const handler: Handler = async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_records');

    if (error) {
      console.error('Cleanup error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    console.log('Cleanup completed:', data);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error: any) {
    console.error('Cleanup exception:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
