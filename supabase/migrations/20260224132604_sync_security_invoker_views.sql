-- 뷰에 security_invoker = true 적용 (스키마 파일과 동기화)
ALTER VIEW "public"."admin_order_list_view" SET (security_invoker = true);
ALTER VIEW "public"."admin_order_detail_view" SET (security_invoker = true);
ALTER VIEW "public"."order_detail_view" SET (security_invoker = true);
