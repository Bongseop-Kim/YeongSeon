create extension if not exists "pgjwt" with schema "extensions";

drop extension if exists "pg_net";

create type "public"."user_role" as enum ('customer', 'admin', 'manager');

create sequence "public"."products_id_seq";


  create table "public"."cart_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "item_id" text not null,
    "item_type" text not null,
    "product_id" integer,
    "selected_option_id" text,
    "reform_data" jsonb,
    "quantity" integer not null,
    "applied_user_coupon_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."cart_items" enable row level security;


  create table "public"."coupons" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "discount_type" text not null,
    "discount_value" numeric(10,2) not null,
    "max_discount_amount" numeric(10,2),
    "description" text,
    "expiry_date" date not null,
    "additional_info" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."coupons" enable row level security;


  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "item_id" text not null,
    "item_type" text not null,
    "product_id" integer,
    "selected_option_id" text,
    "reform_data" jsonb,
    "quantity" integer not null,
    "unit_price" integer not null,
    "discount_amount" integer not null default 0,
    "applied_user_coupon_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "order_number" character varying(50) not null,
    "shipping_address_id" uuid not null,
    "total_price" integer not null,
    "original_price" integer not null,
    "total_discount" integer not null default 0,
    "status" text not null default '대기중'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."orders" enable row level security;


  create table "public"."product_likes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "product_id" integer not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."product_likes" enable row level security;


  create table "public"."product_options" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" integer not null,
    "option_id" character varying(50) not null,
    "name" character varying(255) not null,
    "additional_price" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."product_options" enable row level security;


  create table "public"."products" (
    "id" integer not null default nextval('public.products_id_seq'::regclass),
    "code" character varying(255) not null,
    "name" character varying(255) not null,
    "price" integer not null,
    "image" text not null,
    "category" character varying(50) not null,
    "color" character varying(50) not null,
    "pattern" character varying(50) not null,
    "material" character varying(50) not null,
    "info" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "detail_images" text[]
      );


alter table "public"."products" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "name" character varying not null,
    "phone" character varying,
    "role" public.user_role not null default 'customer'::public.user_role,
    "is_active" boolean not null default true,
    "birth" date
      );


alter table "public"."profiles" enable row level security;


  create table "public"."shipping_addresses" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "recipient_name" character varying not null,
    "recipient_phone" character varying not null,
    "address" text not null,
    "is_default" boolean not null,
    "user_id" uuid not null,
    "postal_code" character varying not null,
    "delivery_memo" text,
    "address_detail" character varying,
    "delivery_request" text
      );


alter table "public"."shipping_addresses" enable row level security;


  create table "public"."user_coupons" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "coupon_id" uuid not null,
    "status" text not null default 'active'::text,
    "issued_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_coupons" enable row level security;

alter sequence "public"."products_id_seq" owned by "public"."products"."id";

CREATE UNIQUE INDEX cart_items_pkey ON public.cart_items USING btree (id);

CREATE UNIQUE INDEX cart_items_unique_user_item ON public.cart_items USING btree (user_id, item_id);

CREATE INDEX coupons_active_idx ON public.coupons USING btree (is_active);

CREATE INDEX coupons_expiry_idx ON public.coupons USING btree (expiry_date);

CREATE UNIQUE INDEX coupons_pkey ON public.coupons USING btree (id);

CREATE INDEX idx_cart_items_created_at ON public.cart_items USING btree (created_at);

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id) WHERE (product_id IS NOT NULL);

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);

CREATE INDEX idx_product_likes_product_id ON public.product_likes USING btree (product_id);

CREATE INDEX idx_product_likes_user_id ON public.product_likes USING btree (user_id);

CREATE INDEX idx_product_options_product_id ON public.product_options USING btree (product_id);

CREATE INDEX idx_products_category ON public.products USING btree (category);

CREATE INDEX idx_products_color ON public.products USING btree (color);

CREATE INDEX idx_products_material ON public.products USING btree (material);

CREATE INDEX idx_products_pattern ON public.products USING btree (pattern);

CREATE INDEX idx_products_price ON public.products USING btree (price);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX product_likes_pkey ON public.product_likes USING btree (id);

CREATE UNIQUE INDEX product_likes_user_id_product_id_key ON public.product_likes USING btree (user_id, product_id);

CREATE UNIQUE INDEX product_options_pkey ON public.product_options USING btree (id);

CREATE UNIQUE INDEX product_options_product_id_option_id_key ON public.product_options USING btree (product_id, option_id);

CREATE UNIQUE INDEX products_code_key ON public.products USING btree (code);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX shipping_addresses_pkey ON public.shipping_addresses USING btree (id);

CREATE INDEX user_coupons_expires_idx ON public.user_coupons USING btree (expires_at);

CREATE UNIQUE INDEX user_coupons_pkey ON public.user_coupons USING btree (id);

CREATE INDEX user_coupons_status_idx ON public.user_coupons USING btree (status);

CREATE INDEX user_coupons_user_id_idx ON public.user_coupons USING btree (user_id);

alter table "public"."cart_items" add constraint "cart_items_pkey" PRIMARY KEY using index "cart_items_pkey";

alter table "public"."coupons" add constraint "coupons_pkey" PRIMARY KEY using index "coupons_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."product_likes" add constraint "product_likes_pkey" PRIMARY KEY using index "product_likes_pkey";

alter table "public"."product_options" add constraint "product_options_pkey" PRIMARY KEY using index "product_options_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."shipping_addresses" add constraint "shipping_addresses_pkey" PRIMARY KEY using index "shipping_addresses_pkey";

alter table "public"."user_coupons" add constraint "user_coupons_pkey" PRIMARY KEY using index "user_coupons_pkey";

alter table "public"."cart_items" add constraint "cart_items_item_type_check" CHECK ((item_type = ANY (ARRAY['product'::text, 'reform'::text]))) not valid;

alter table "public"."cart_items" validate constraint "cart_items_item_type_check";

alter table "public"."cart_items" add constraint "cart_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."cart_items" validate constraint "cart_items_quantity_check";

alter table "public"."cart_items" add constraint "cart_items_type_check" CHECK ((((item_type = 'product'::text) AND (product_id IS NOT NULL) AND (reform_data IS NULL)) OR ((item_type = 'reform'::text) AND (product_id IS NULL) AND (reform_data IS NOT NULL)))) not valid;

alter table "public"."cart_items" validate constraint "cart_items_type_check";

alter table "public"."cart_items" add constraint "cart_items_unique_user_item" UNIQUE using index "cart_items_unique_user_item";

alter table "public"."cart_items" add constraint "cart_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."cart_items" validate constraint "cart_items_user_id_fkey";

alter table "public"."coupons" add constraint "coupons_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))) not valid;

alter table "public"."coupons" validate constraint "coupons_discount_type_check";

alter table "public"."coupons" add constraint "coupons_discount_value_check" CHECK ((discount_value > (0)::numeric)) not valid;

alter table "public"."coupons" validate constraint "coupons_discount_value_check";

alter table "public"."order_items" add constraint "order_items_applied_user_coupon_id_fkey" FOREIGN KEY (applied_user_coupon_id) REFERENCES public.user_coupons(id) not valid;

alter table "public"."order_items" validate constraint "order_items_applied_user_coupon_id_fkey";

alter table "public"."order_items" add constraint "order_items_discount_amount_check" CHECK ((discount_amount >= 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_discount_amount_check";

alter table "public"."order_items" add constraint "order_items_item_type_check" CHECK ((item_type = ANY (ARRAY['product'::text, 'reform'::text]))) not valid;

alter table "public"."order_items" validate constraint "order_items_item_type_check";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."order_items" add constraint "order_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_quantity_check";

alter table "public"."order_items" add constraint "order_items_unit_price_check" CHECK ((unit_price >= 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_unit_price_check";

alter table "public"."orders" add constraint "orders_order_number_key" UNIQUE using index "orders_order_number_key";

alter table "public"."orders" add constraint "orders_original_price_check" CHECK ((original_price >= 0)) not valid;

alter table "public"."orders" validate constraint "orders_original_price_check";

alter table "public"."orders" add constraint "orders_shipping_address_id_fkey" FOREIGN KEY (shipping_address_id) REFERENCES public.shipping_addresses(id) not valid;

alter table "public"."orders" validate constraint "orders_shipping_address_id_fkey";

alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['대기중'::text, '진행중'::text, '배송중'::text, '완료'::text, '취소'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

alter table "public"."orders" add constraint "orders_total_discount_check" CHECK ((total_discount >= 0)) not valid;

alter table "public"."orders" validate constraint "orders_total_discount_check";

alter table "public"."orders" add constraint "orders_total_price_check" CHECK ((total_price >= 0)) not valid;

alter table "public"."orders" validate constraint "orders_total_price_check";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."product_likes" add constraint "product_likes_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_likes" validate constraint "product_likes_product_id_fkey";

alter table "public"."product_likes" add constraint "product_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."product_likes" validate constraint "product_likes_user_id_fkey";

alter table "public"."product_likes" add constraint "product_likes_user_id_product_id_key" UNIQUE using index "product_likes_user_id_product_id_key";

alter table "public"."product_options" add constraint "product_options_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_options" validate constraint "product_options_product_id_fkey";

alter table "public"."product_options" add constraint "product_options_product_id_option_id_key" UNIQUE using index "product_options_product_id_option_id_key";

alter table "public"."products" add constraint "products_category_check" CHECK (((category)::text = ANY ((ARRAY['3fold'::character varying, 'sfolderato'::character varying, 'knit'::character varying, 'bowtie'::character varying])::text[]))) not valid;

alter table "public"."products" validate constraint "products_category_check";

alter table "public"."products" add constraint "products_code_key" UNIQUE using index "products_code_key";

alter table "public"."products" add constraint "products_color_check" CHECK (((color)::text = ANY ((ARRAY['black'::character varying, 'navy'::character varying, 'gray'::character varying, 'wine'::character varying, 'blue'::character varying, 'brown'::character varying, 'beige'::character varying, 'silver'::character varying])::text[]))) not valid;

alter table "public"."products" validate constraint "products_color_check";

alter table "public"."products" add constraint "products_material_check" CHECK (((material)::text = ANY ((ARRAY['silk'::character varying, 'cotton'::character varying, 'polyester'::character varying, 'wool'::character varying])::text[]))) not valid;

alter table "public"."products" validate constraint "products_material_check";

alter table "public"."products" add constraint "products_pattern_check" CHECK (((pattern)::text = ANY ((ARRAY['solid'::character varying, 'stripe'::character varying, 'dot'::character varying, 'check'::character varying, 'paisley'::character varying])::text[]))) not valid;

alter table "public"."products" validate constraint "products_pattern_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."shipping_addresses" add constraint "shipping_addresses_user_id_fkey1" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."shipping_addresses" validate constraint "shipping_addresses_user_id_fkey1";

alter table "public"."user_coupons" add constraint "user_coupons_coupon_id_fkey" FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) not valid;

alter table "public"."user_coupons" validate constraint "user_coupons_coupon_id_fkey";

alter table "public"."user_coupons" add constraint "user_coupons_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'revoked'::text]))) not valid;

alter table "public"."user_coupons" validate constraint "user_coupons_status_check";

alter table "public"."user_coupons" add constraint "user_coupons_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_coupons" validate constraint "user_coupons_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.decrement_product_likes(product_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE products
  SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
  WHERE id = product_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  order_num TEXT;
  date_str TEXT;
  seq_num INTEGER;
BEGIN
  date_str := TO_CHAR(now(), 'YYYYMMDD');
  
  -- 오늘 날짜로 시작하는 주문 번호 중 가장 큰 시퀀스 번호 찾기
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 14) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || date_str || '-%';
  
  order_num := 'ORD-' || date_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  RETURN order_num;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_cart_items(p_user_id uuid, p_active_only boolean DEFAULT true)
 RETURNS SETOF jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  with cart as (
    select *
    from cart_items
    where user_id = p_user_id
      and user_id = auth.uid()
    order by created_at asc
  ),
  product_ids as (
    select array_agg(distinct product_id)::integer[] as ids
    from cart
    where product_id is not null
  ),
  products as (
    select *
    from get_products_by_ids(
      coalesce((select ids from product_ids), '{}'::integer[])
    )
  ),
  coupon_ids as (
    select array_agg(distinct applied_user_coupon_id)::uuid[] as ids
    from cart
    where applied_user_coupon_id is not null
  ),
  coupons as (
    select
      uc.id,
      jsonb_build_object(
        'id', uc.id,
        'userId', uc.user_id,
        'couponId', uc.coupon_id,
        'status', uc.status,
        'issuedAt', uc.issued_at,
        'expiresAt', uc.expires_at,
        'usedAt', uc.used_at,
        'coupon', jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'discountType', c.discount_type,
          'discountValue', c.discount_value,
          'maxDiscountAmount', c.max_discount_amount,
          'description', c.description,
          'expiryDate', c.expiry_date,
          'additionalInfo', c.additional_info
        )
      ) as user_coupon
    from user_coupons uc
    join coupons c on c.id = uc.coupon_id
    where uc.user_id = p_user_id
      and uc.user_id = auth.uid()
      and uc.id = any(coalesce((select ids from coupon_ids), '{}'::uuid[]))
      and (
        not p_active_only
        or (
          uc.status = 'active'
          and (uc.expires_at is null or uc.expires_at > now())
          and c.is_active = true
          and c.expiry_date >= current_date
        )
      )
  )
  select jsonb_build_object(
    'id', cart.item_id,
    'type', cart.item_type,
    'product', case
      when cart.item_type = 'product' then to_jsonb(p)
      else null
    end,
    'selectedOption', case
      when cart.item_type = 'product' and cart.selected_option_id is not null then (
        select option
        from jsonb_array_elements(
          coalesce(to_jsonb(p)->'options', '[]'::jsonb)
        ) option
        where option->>'id' = cart.selected_option_id
        limit 1
      )
      else null
    end,
    'quantity', cart.quantity,
    'reformData', cart.reform_data,
    'appliedCoupon', coupons.user_coupon,
    'appliedCouponId', cart.applied_user_coupon_id
  )
  from cart
  left join products p on p.id = cart.product_id
  left join coupons on coupons.id = cart.applied_user_coupon_id
  order by cart.created_at asc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'date', to_char(o.created_at, 'YYYY-MM-DD'),
    'status', o.status,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'type', oi.type,
          'product', oi.product,
          'selectedOption', oi.selected_option,
          'quantity', oi.quantity,
          'reformData', oi.reform_data,
          'appliedCoupon', oi.applied_coupon
        )
        order by oi.created_at asc
      )
      from order_items_view oi
      where oi.order_id = o.id
    ), '[]'::jsonb),
    'totalPrice', o.total_price
  )
  from orders o
  where o.user_id = auth.uid()
    and o.id = p_order_id
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_orders()
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'date', to_char(o.created_at, 'YYYY-MM-DD'),
    'status', o.status,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'type', oi.type,
          'product', oi.product,
          'selectedOption', oi.selected_option,
          'quantity', oi.quantity,
          'reformData', oi.reform_data,
          'appliedCoupon', oi.applied_coupon
        )
        order by oi.created_at asc
      )
      from order_items_view oi
      where oi.order_id = o.id
    ), '[]'::jsonb),
    'totalPrice', o.total_price
  )
  from orders o
  where o.user_id = auth.uid()
  order by o.created_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_product_by_id(p_id integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select to_jsonb(row_data)
  from (
    select
      p.id,
      p.code,
      p.name,
      p.price,
      p.image,
      p.category,
      p.color,
      p.pattern,
      p.material,
      p.info,
      p.created_at,
      p.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', po.option_id,
            'name', po.name,
            'additionalPrice', po.additional_price
          )
          order by po.option_id
        ) filter (where po.id is not null),
        '[]'::jsonb
      ) as options,
      coalesce(lc.likes, 0) as likes,
      exists (
        select 1
        from product_likes pl
        where pl.product_id = p.id
          and pl.user_id = auth.uid()
      ) as "isLiked"
    from products p
    left join product_options po on po.product_id = p.id
    left join (
      select product_id, count(*)::int as likes
      from product_likes
      group by product_id
    ) lc on lc.product_id = p.id
    where p.id = p_id
    group by
      p.id,
      p.code,
      p.name,
      p.price,
      p.image,
      p.category,
      p.color,
      p.pattern,
      p.material,
      p.info,
      p.created_at,
      p.updated_at,
      lc.likes
  ) row_data;
$function$
;

CREATE OR REPLACE FUNCTION public.get_products(p_categories text[] DEFAULT NULL::text[], p_colors text[] DEFAULT NULL::text[], p_patterns text[] DEFAULT NULL::text[], p_materials text[] DEFAULT NULL::text[], p_price_min integer DEFAULT NULL::integer, p_price_max integer DEFAULT NULL::integer, p_sort_option text DEFAULT 'latest'::text)
 RETURNS TABLE(id integer, code character varying, name character varying, price integer, image text, category character varying, color character varying, pattern character varying, material character varying, info text, created_at timestamp with time zone, updated_at timestamp with time zone, options jsonb, likes integer, "isLiked" boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.option_id,
          'name', po.name,
          'additionalPrice', po.additional_price
        )
        order by po.option_id
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(lc.likes, 0) as likes,
    exists (
      select 1
      from product_likes pl
      where pl.product_id = p.id
        and pl.user_id = auth.uid()
    ) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join (
    select product_id, count(*)::int as likes
    from product_likes
    group by product_id
  ) lc on lc.product_id = p.id
  where
    (p_categories is null or array_length(p_categories, 1) = 0 or p.category = any (p_categories))
    and (p_colors is null or array_length(p_colors, 1) = 0 or p.color = any (p_colors))
    and (p_patterns is null or array_length(p_patterns, 1) = 0 or p.pattern = any (p_patterns))
    and (p_materials is null or array_length(p_materials, 1) = 0 or p.material = any (p_materials))
    and (p_price_min is null or p.price >= p_price_min)
    and (p_price_max is null or p.price <= p_price_max)
  group by
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    lc.likes
  order by
    case when p_sort_option = 'latest' then p.id end desc,
    case when p_sort_option = 'price-low' then p.price end asc,
    case when p_sort_option = 'price-high' then p.price end desc,
    case when p_sort_option = 'popular' then coalesce(lc.likes, 0) end desc,
    p.id desc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_products_by_ids(p_ids integer[])
 RETURNS TABLE(id integer, code character varying, name character varying, price integer, image text, category character varying, color character varying, pattern character varying, material character varying, info text, created_at timestamp with time zone, updated_at timestamp with time zone, options jsonb, likes integer, "isLiked" boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.option_id,
          'name', po.name,
          'additionalPrice', po.additional_price
        )
        order by po.option_id
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(lc.likes, 0) as likes,
    exists (
      select 1
      from product_likes pl
      where pl.product_id = p.id
        and pl.user_id = auth.uid()
    ) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join (
    select product_id, count(*)::int as likes
    from product_likes
    group by product_id
  ) lc on lc.product_id = p.id
  where p.id = any (p_ids)
  group by
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    lc.likes
  order by p.id;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_product_likes(product_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE products
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = product_id;
END;
$function$
;

create or replace view "public"."order_items_view" as  SELECT oi.order_id,
    oi.created_at,
    oi.item_id AS id,
    oi.item_type AS type,
        CASE
            WHEN (oi.item_type = 'product'::text) THEN to_jsonb(p.*)
            ELSE NULL::jsonb
        END AS product,
        CASE
            WHEN ((oi.item_type = 'product'::text) AND (oi.selected_option_id IS NOT NULL)) THEN ( SELECT option.value AS option
               FROM jsonb_array_elements(COALESCE((to_jsonb(p.*) -> 'options'::text), '[]'::jsonb)) option(value)
              WHERE ((option.value ->> 'id'::text) = oi.selected_option_id)
             LIMIT 1)
            ELSE NULL::jsonb
        END AS selected_option,
    oi.quantity,
    oi.reform_data,
    uc.user_coupon AS applied_coupon
   FROM ((public.order_items oi
     LEFT JOIN LATERAL ( SELECT get_products_by_ids.id,
            get_products_by_ids.code,
            get_products_by_ids.name,
            get_products_by_ids.price,
            get_products_by_ids.image,
            get_products_by_ids.category,
            get_products_by_ids.color,
            get_products_by_ids.pattern,
            get_products_by_ids.material,
            get_products_by_ids.info,
            get_products_by_ids.created_at,
            get_products_by_ids.updated_at,
            get_products_by_ids.options,
            get_products_by_ids.likes,
            get_products_by_ids."isLiked"
           FROM public.get_products_by_ids(ARRAY[oi.product_id]) get_products_by_ids(id, code, name, price, image, category, color, pattern, material, info, created_at, updated_at, options, likes, "isLiked")
         LIMIT 1) p ON (((oi.item_type = 'product'::text) AND (oi.product_id IS NOT NULL))))
     LEFT JOIN LATERAL ( SELECT uc_1.id,
            jsonb_build_object('id', uc_1.id, 'userId', uc_1.user_id, 'couponId', uc_1.coupon_id, 'status', uc_1.status, 'issuedAt', uc_1.issued_at, 'expiresAt', uc_1.expires_at, 'usedAt', uc_1.used_at, 'coupon', jsonb_build_object('id', c.id, 'name', c.name, 'discountType', c.discount_type, 'discountValue', c.discount_value, 'maxDiscountAmount', c.max_discount_amount, 'description', c.description, 'expiryDate', c.expiry_date, 'additionalInfo', c.additional_info)) AS user_coupon
           FROM (public.user_coupons uc_1
             JOIN public.coupons c ON ((c.id = uc_1.coupon_id)))
          WHERE (uc_1.id = oi.applied_user_coupon_id)
         LIMIT 1) uc ON (true));


CREATE OR REPLACE FUNCTION public.replace_cart_items(p_user_id uuid, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  item_record jsonb;
  coupon_id_text text;
begin
  delete from cart_items where user_id = p_user_id;

  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for item_record in select * from jsonb_array_elements(p_items)
    loop
      coupon_id_text := coalesce(
        item_record->'appliedCoupon'->>'id',
        item_record->>'appliedCouponId'
      );

      insert into cart_items (
        user_id,
        item_id,
        item_type,
        product_id,
        selected_option_id,
        reform_data,
        quantity,
        applied_user_coupon_id
      )
      values (
        p_user_id,
        item_record->>'id',
        (item_record->>'type')::text,
        case
          when item_record->'product' is null then null
          when item_record->'product'->>'id' is null or item_record->'product'->>'id' = 'null' then null
          else (item_record->'product'->>'id')::integer
        end,
        case
          when item_record->'selectedOption' is null then null
          when item_record->'selectedOption'->>'id' is null or item_record->'selectedOption'->>'id' = '' then null
          else item_record->'selectedOption'->>'id'
        end,
        case
          when item_record->'reformData' is null or item_record->'reformData' = 'null'::jsonb then null
          else item_record->'reformData'
        end,
        (item_record->>'quantity')::integer,
        case
          when coupon_id_text is null or coupon_id_text = '' then null
          else coupon_id_text::uuid
        end
      );
    end loop;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_cart_items_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."cart_items" to "anon";

grant insert on table "public"."cart_items" to "anon";

grant references on table "public"."cart_items" to "anon";

grant select on table "public"."cart_items" to "anon";

grant trigger on table "public"."cart_items" to "anon";

grant truncate on table "public"."cart_items" to "anon";

grant update on table "public"."cart_items" to "anon";

grant delete on table "public"."cart_items" to "authenticated";

grant insert on table "public"."cart_items" to "authenticated";

grant references on table "public"."cart_items" to "authenticated";

grant select on table "public"."cart_items" to "authenticated";

grant trigger on table "public"."cart_items" to "authenticated";

grant truncate on table "public"."cart_items" to "authenticated";

grant update on table "public"."cart_items" to "authenticated";

grant delete on table "public"."cart_items" to "service_role";

grant insert on table "public"."cart_items" to "service_role";

grant references on table "public"."cart_items" to "service_role";

grant select on table "public"."cart_items" to "service_role";

grant trigger on table "public"."cart_items" to "service_role";

grant truncate on table "public"."cart_items" to "service_role";

grant update on table "public"."cart_items" to "service_role";

grant delete on table "public"."coupons" to "anon";

grant insert on table "public"."coupons" to "anon";

grant references on table "public"."coupons" to "anon";

grant select on table "public"."coupons" to "anon";

grant trigger on table "public"."coupons" to "anon";

grant truncate on table "public"."coupons" to "anon";

grant update on table "public"."coupons" to "anon";

grant delete on table "public"."coupons" to "authenticated";

grant insert on table "public"."coupons" to "authenticated";

grant references on table "public"."coupons" to "authenticated";

grant select on table "public"."coupons" to "authenticated";

grant trigger on table "public"."coupons" to "authenticated";

grant truncate on table "public"."coupons" to "authenticated";

grant update on table "public"."coupons" to "authenticated";

grant delete on table "public"."coupons" to "service_role";

grant insert on table "public"."coupons" to "service_role";

grant references on table "public"."coupons" to "service_role";

grant select on table "public"."coupons" to "service_role";

grant trigger on table "public"."coupons" to "service_role";

grant truncate on table "public"."coupons" to "service_role";

grant update on table "public"."coupons" to "service_role";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."product_likes" to "anon";

grant insert on table "public"."product_likes" to "anon";

grant references on table "public"."product_likes" to "anon";

grant select on table "public"."product_likes" to "anon";

grant trigger on table "public"."product_likes" to "anon";

grant truncate on table "public"."product_likes" to "anon";

grant update on table "public"."product_likes" to "anon";

grant delete on table "public"."product_likes" to "authenticated";

grant insert on table "public"."product_likes" to "authenticated";

grant references on table "public"."product_likes" to "authenticated";

grant select on table "public"."product_likes" to "authenticated";

grant trigger on table "public"."product_likes" to "authenticated";

grant truncate on table "public"."product_likes" to "authenticated";

grant update on table "public"."product_likes" to "authenticated";

grant delete on table "public"."product_likes" to "service_role";

grant insert on table "public"."product_likes" to "service_role";

grant references on table "public"."product_likes" to "service_role";

grant select on table "public"."product_likes" to "service_role";

grant trigger on table "public"."product_likes" to "service_role";

grant truncate on table "public"."product_likes" to "service_role";

grant update on table "public"."product_likes" to "service_role";

grant delete on table "public"."product_options" to "anon";

grant insert on table "public"."product_options" to "anon";

grant references on table "public"."product_options" to "anon";

grant select on table "public"."product_options" to "anon";

grant trigger on table "public"."product_options" to "anon";

grant truncate on table "public"."product_options" to "anon";

grant update on table "public"."product_options" to "anon";

grant delete on table "public"."product_options" to "authenticated";

grant insert on table "public"."product_options" to "authenticated";

grant references on table "public"."product_options" to "authenticated";

grant select on table "public"."product_options" to "authenticated";

grant trigger on table "public"."product_options" to "authenticated";

grant truncate on table "public"."product_options" to "authenticated";

grant update on table "public"."product_options" to "authenticated";

grant delete on table "public"."product_options" to "service_role";

grant insert on table "public"."product_options" to "service_role";

grant references on table "public"."product_options" to "service_role";

grant select on table "public"."product_options" to "service_role";

grant trigger on table "public"."product_options" to "service_role";

grant truncate on table "public"."product_options" to "service_role";

grant update on table "public"."product_options" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."shipping_addresses" to "anon";

grant insert on table "public"."shipping_addresses" to "anon";

grant references on table "public"."shipping_addresses" to "anon";

grant select on table "public"."shipping_addresses" to "anon";

grant trigger on table "public"."shipping_addresses" to "anon";

grant truncate on table "public"."shipping_addresses" to "anon";

grant update on table "public"."shipping_addresses" to "anon";

grant delete on table "public"."shipping_addresses" to "authenticated";

grant insert on table "public"."shipping_addresses" to "authenticated";

grant references on table "public"."shipping_addresses" to "authenticated";

grant select on table "public"."shipping_addresses" to "authenticated";

grant trigger on table "public"."shipping_addresses" to "authenticated";

grant truncate on table "public"."shipping_addresses" to "authenticated";

grant update on table "public"."shipping_addresses" to "authenticated";

grant delete on table "public"."shipping_addresses" to "service_role";

grant insert on table "public"."shipping_addresses" to "service_role";

grant references on table "public"."shipping_addresses" to "service_role";

grant select on table "public"."shipping_addresses" to "service_role";

grant trigger on table "public"."shipping_addresses" to "service_role";

grant truncate on table "public"."shipping_addresses" to "service_role";

grant update on table "public"."shipping_addresses" to "service_role";

grant delete on table "public"."user_coupons" to "anon";

grant insert on table "public"."user_coupons" to "anon";

grant references on table "public"."user_coupons" to "anon";

grant select on table "public"."user_coupons" to "anon";

grant trigger on table "public"."user_coupons" to "anon";

grant truncate on table "public"."user_coupons" to "anon";

grant update on table "public"."user_coupons" to "anon";

grant delete on table "public"."user_coupons" to "authenticated";

grant insert on table "public"."user_coupons" to "authenticated";

grant references on table "public"."user_coupons" to "authenticated";

grant select on table "public"."user_coupons" to "authenticated";

grant trigger on table "public"."user_coupons" to "authenticated";

grant truncate on table "public"."user_coupons" to "authenticated";

grant update on table "public"."user_coupons" to "authenticated";

grant delete on table "public"."user_coupons" to "service_role";

grant insert on table "public"."user_coupons" to "service_role";

grant references on table "public"."user_coupons" to "service_role";

grant select on table "public"."user_coupons" to "service_role";

grant trigger on table "public"."user_coupons" to "service_role";

grant truncate on table "public"."user_coupons" to "service_role";

grant update on table "public"."user_coupons" to "service_role";


  create policy "Users can delete their own cart items"
  on "public"."cart_items"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own cart items"
  on "public"."cart_items"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own cart items"
  on "public"."cart_items"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own cart items"
  on "public"."cart_items"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Allow read access to coupons"
  on "public"."coupons"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service role full access to coupons"
  on "public"."coupons"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "Users can create their own order items"
  on "public"."order_items"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));



  create policy "Users can view their own order items"
  on "public"."order_items"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));



  create policy "Users can create their own orders"
  on "public"."orders"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own orders"
  on "public"."orders"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Anyone can view like counts"
  on "public"."product_likes"
  as permissive
  for select
  to public
using (true);



  create policy "Users can delete their own likes"
  on "public"."product_likes"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own likes"
  on "public"."product_likes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own likes"
  on "public"."product_likes"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Allow public read access to product_options"
  on "public"."product_options"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public read access to products"
  on "public"."products"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Enable delete for users based on user_id"
  on "public"."shipping_addresses"
  as permissive
  for delete
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Enable insert for users based on user_id"
  on "public"."shipping_addresses"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Enable update for users based on user_id"
  on "public"."shipping_addresses"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Enable users to view their own data only"
  on "public"."shipping_addresses"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "user_coupons_select_own"
  on "public"."user_coupons"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "user_coupons_service_all"
  on "public"."user_coupons"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_cart_items_updated_at();

CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER user_coupons_set_updated_at BEFORE UPDATE ON public.user_coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


