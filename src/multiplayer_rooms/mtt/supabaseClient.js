import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrzfvlozwjunudzyzfoa.supabase.co';
const supabaseKey = 'sb_publishable_PEcb1FJLRUYnXrAMJM6E7A_albosyT4';
export const supabase = createClient(supabaseUrl, supabaseKey);