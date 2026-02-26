-- Remove specific cart items by item_id list (used after payment success)
CREATE OR REPLACE FUNCTION public.remove_cart_items_by_ids(
  p_user_id uuid,
  p_item_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if auth.uid() is null or p_user_id is null then
    raise exception 'unauthorized: authentication required';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized: cart can only be modified for the current user';
  end if;

  delete from cart_items
  where user_id = p_user_id
    and item_id = any(p_item_ids);
end;
$$;
