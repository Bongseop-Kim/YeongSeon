SET check_function_bodies = off;

TRUNCATE TABLE public.product_options, public.products, public.pricing_constants, public.admin_settings RESTART IDENTITY CASCADE;

INSERT INTO public.admin_settings (key, value)
VALUES
  ('default_courier_company', '롯데택배'),
  ('design_token_cost_gemini_image', '3'),
  ('design_token_cost_gemini_image_high', '3'),
  ('design_token_cost_gemini_text', '1'),
  ('design_token_cost_openai_image', '5'),
  ('design_token_cost_openai_image_high', '12'),
  ('design_token_cost_openai_render_standard', '5'),
  ('design_token_cost_openai_text', '1'),
  ('design_token_cost_tile_render_standard', '5'),
  ('design_token_initial_grant', '10');

INSERT INTO public.pricing_constants (key, amount, category)
VALUES
  ('AUTO_TIE_COST', 1000, 'custom_order'),
  ('BAR_TACK_COST', 1000, 'custom_order'),
  ('BRAND_LABEL_COST', 300, 'custom_order'),
  ('CARE_LABEL_COST', 300, 'custom_order'),
  ('DIMPLE_COST', 7000, 'custom_order'),
  ('FABRIC_PRINTING_POLY', 8000, 'fabric'),
  ('FABRIC_PRINTING_SILK', 20000, 'fabric'),
  ('FABRIC_QTY_ADULT', 4, 'custom_order'),
  ('FABRIC_QTY_ADULT_FOLD7', 1, 'custom_order'),
  ('FABRIC_QTY_CHILD', 6, 'custom_order'),
  ('FABRIC_YARN_DYED_POLY', 20000, 'fabric'),
  ('FABRIC_YARN_DYED_SILK', 25000, 'fabric'),
  ('FOLD7_COST', 55000, 'custom_order'),
  ('REFORM_BASE_COST', 16000, 'reform'),
  ('REFORM_PICKUP_FEE', 3000, 'reform'),
  ('REFORM_SHIPPING_COST', 4500, 'reform'),
  ('REFORM_WIDTH_COST', 30000, 'reform'),
  ('sample_discount_fabric_and_sewing_printing', 200000, 'sample_discount'),
  ('sample_discount_fabric_and_sewing_yarn_dyed', 200000, 'sample_discount'),
  ('sample_discount_fabric_printing', 100000, 'sample_discount'),
  ('sample_discount_fabric_yarn_dyed', 100000, 'sample_discount'),
  ('sample_discount_sewing', 100000, 'sample_discount'),
  ('SAMPLE_FABRIC_AND_SEWING_COST', 150000, 'custom_order'),
  ('SAMPLE_FABRIC_AND_SEWING_PRINTING_COST', 200000, 'custom_order'),
  ('SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST', 200000, 'custom_order'),
  ('SAMPLE_FABRIC_COST', 100000, 'custom_order'),
  ('SAMPLE_FABRIC_PRINTING_COST', 100000, 'custom_order'),
  ('SAMPLE_FABRIC_YARN_DYED_COST', 100000, 'custom_order'),
  ('SAMPLE_SEWING_COST', 100000, 'custom_order'),
  ('SEWING_PER_COST', 5000, 'custom_order'),
  ('SIDE_STITCH_COST', 1000, 'custom_order'),
  ('SPODERATO_COST', 25000, 'custom_order'),
  ('START_COST', 100000, 'custom_order'),
  ('token_plan_popular_amount', 135, 'token'),
  ('token_plan_popular_price', 7900, 'token'),
  ('token_plan_pro_amount', 350, 'token'),
  ('token_plan_pro_price', 14900, 'token'),
  ('token_plan_starter_amount', 30, 'token'),
  ('token_plan_starter_price', 2900, 'token'),
  ('TRIANGLE_STITCH_COST', 1000, 'custom_order'),
  ('WOOL_INTERLINING_COST', 500, 'custom_order'),
  ('YARN_DYED_DESIGN_COST', 100000, 'custom_order');

INSERT INTO public.products (id, code, name, price, image, category, color, pattern, material, info, detail_images, stock, option_label)
VALUES
  (21, '3F-20260226-001', '테스트', 3000, 'https://ik.imagekit.io/essesion/products/u2621914281_elegant_silk_necktie_classic_diagonal_stripes_nav_bbdc8736-f6c3-4e71-9cc0-f5d8d5588661_2_It8Qtm_ua.png', '3fold', 'navy', 'solid', 'cotton', '테스트', ARRAY['https://ik.imagekit.io/essesion/products/u2621914281_elegant_silk_necktie_classic_diagonal_stripes_nav_bbdc8736-f6c3-4e71-9cc0-f5d8d5588661_2_It8Qtm_ua.png','https://ik.imagekit.io/essesion/products/u2621914281_macro_product_shot_of_silk_fabric_for_necktie_pro_a56d19d8-8566-4203-ad1d-efa49446e691_3_q8lPHynJq.png','https://ik.imagekit.io/essesion/products/u2621914281_Italian_luxury_silk_tie_bold_geometric_pattern_fo_36b73c67-675d-4ebe-9041-02118c9d1138_2_5WIcRgcDq.png'], 49, NULL),
  (22, '3F-20260307-001', '스트라이프 자동타이', 6000, 'https://ik.imagekit.io/essesion/products/IMG_2964_QnFgtlb7J.jpeg', '3fold', 'black', 'stripe', 'wool', '스트라이프', ARRAY['https://ik.imagekit.io/essesion/products/IMG_2964_QnFgtlb7J.jpeg'], 189, NULL),
  (23, '3F-20260419-001', '제일모직 프리미엄 울 blend 솔리드 타이', 50000, 'https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_fckdo9fckdo9fckd_bZgDfJlt5.jpeg', '3fold', 'wine', 'solid', 'wool', '제일모직 프리미엄 울 blend 솔리드 타이', ARRAY['https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_fckdo9fckdo9fckd_bZgDfJlt5.jpeg','https://ik.imagekit.io/essesion/products/IMG_2267_p8CtvOX3I.jpeg','https://ik.imagekit.io/essesion/products/IMG_2265_3sD_afeedo.jpeg','https://ik.imagekit.io/essesion/products/IMG_2262_lVv6lXsCov.jpeg','https://ik.imagekit.io/essesion/products/IMG_2258_bBmOAQOGZ.jpeg','https://ik.imagekit.io/essesion/products/IMG_2281_f2EFP4Ih6.jpeg','https://ik.imagekit.io/essesion/products/4BA61952-1FBC-463F-8413-97C683E0BC62_1_201_a_oXZCv3QOP.jpeg','https://ik.imagekit.io/essesion/products/67E4DBAD-BA85-4B00-89C0-62C5B9A30147_1_201_a_pz1qkoNqY.jpeg'], 10, NULL),
  (24, '3F-20260419-002', '제일모직 프리미엄 울 blend 솔리드 블랙', 50000, 'https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_46249k46249k4624_BrkroNtCG.jpeg', '3fold', 'black', 'solid', 'wool', '제일모직 프리미엄 울 blend 솔리드 블랙', ARRAY['https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_46249k46249k4624_BrkroNtCG.jpeg','https://ik.imagekit.io/essesion/products/IMG_2306_h9dys7qlVs.jpeg','https://ik.imagekit.io/essesion/products/IMG_2303_n-6hVrCby.jpeg','https://ik.imagekit.io/essesion/products/IMG_2300_t-cq7jn3QC.jpeg','https://ik.imagekit.io/essesion/products/IMG_2298_bXGW34b_-J.jpeg','https://ik.imagekit.io/essesion/products/IMG_2291_sjbbVmXE07.jpeg','https://ik.imagekit.io/essesion/products/IMG_2288_-okd0ti_J.jpeg','https://ik.imagekit.io/essesion/products/IMG_2286_ht1Rx2KJc.jpeg','https://ik.imagekit.io/essesion/products/IMG_2285_i_-1yz03x.jpeg','https://ik.imagekit.io/essesion/products/IMG_2284_VuXMEY71R.jpeg'], 10, NULL),
  (25, '3F-20260419-003', '프리미엄 스트라이프 울블랜드 네이비', 50000, 'https://ik.imagekit.io/essesion/products/normal_cropped2_UPyxU63ws.png', '3fold', 'navy', 'stripe', 'wool', '프리미엄 스트라이프 울블랜드 네이비', ARRAY['https://ik.imagekit.io/essesion/products/normal_cropped2_UPyxU63ws.png','https://ik.imagekit.io/essesion/products/IMG_2316_hwoTMznu1.jpeg','https://ik.imagekit.io/essesion/products/IMG_2315_OHpLJdmB5.jpeg','https://ik.imagekit.io/essesion/products/IMG_2314_E2xkKpBgkG.jpeg','https://ik.imagekit.io/essesion/products/IMG_2312_t-0Dvm5-PA.jpeg','https://ik.imagekit.io/essesion/products/IMG_2311_DMHFN0iyPV.jpeg','https://ik.imagekit.io/essesion/products/IMG_2310_vy4ev4RqP.jpeg','https://ik.imagekit.io/essesion/products/IMG_2309_2K3olmBXi.jpeg','https://ik.imagekit.io/essesion/products/IMG_2308_SatskRht3.jpeg'], 10, NULL),
  (26, '3F-20260419-004', '프리미엄 스트라이프 울블랜드 다크그레이', 50000, 'https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_2066qg2066qg2066_7qm9QwfB7.jpeg', '3fold', 'gray', 'stripe', 'wool', '프리미엄 스트라이프 울블랜드 다크그레이', ARRAY['https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_2066qg2066qg2066_7qm9QwfB7.jpeg','https://ik.imagekit.io/essesion/products/IMG_2337_hOpsTUVdY6.jpeg','https://ik.imagekit.io/essesion/products/IMG_2335_RgPF74vw4.jpeg','https://ik.imagekit.io/essesion/products/IMG_2333_UlmtvccERJ.jpeg','https://ik.imagekit.io/essesion/products/IMG_2332_zPkK_8CxBD.jpeg','https://ik.imagekit.io/essesion/products/IMG_2331_SrTdxYxSs.jpeg','https://ik.imagekit.io/essesion/products/IMG_2330_Ias_BgbX5.jpeg','https://ik.imagekit.io/essesion/products/IMG_2329_IteEPzptL.jpeg'], 10, NULL),
  (27, '3F-20260419-005', '프리미엄 울 blend 글렌 체크 그레이', 50000, 'https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_uw3f5yuw3f5yuw3f_zlZN7lZme.jpeg', '3fold', 'gray', 'check', 'wool', '프리미엄 울 blend 글렌 체크 그레이', ARRAY['https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_uw3f5yuw3f5yuw3f_zlZN7lZme.jpeg','https://ik.imagekit.io/essesion/products/IMG_2326_0r4ujE4e_4.jpeg','https://ik.imagekit.io/essesion/products/IMG_2323_-vD48hFys.jpeg','https://ik.imagekit.io/essesion/products/IMG_2322_ka3iuPTONy.jpeg','https://ik.imagekit.io/essesion/products/IMG_2321_xldDcQmoI.jpeg','https://ik.imagekit.io/essesion/products/IMG_2320_eeAFBi0nR.jpeg','https://ik.imagekit.io/essesion/products/IMG_2319_MsoATeG5xt.jpeg','https://ik.imagekit.io/essesion/products/IMG_2318_A92PSMo3v.jpeg','https://ik.imagekit.io/essesion/products/IMG_2317_1LA8tJ1ga.jpeg'], 10, NULL),
  (28, '3F-20260419-006', '울 blend 마이크로 도트', 50000, 'https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_wfpbd1wfpbd1wfpb_QqCVL8onJ.jpeg', '3fold', 'gray', 'dot', 'wool', '울 blend 마이크로 도트', ARRAY['https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_wfpbd1wfpbd1wfpb_QqCVL8onJ.jpeg','https://ik.imagekit.io/essesion/products/IMG_2283_we0ohsOc_.jpeg','https://ik.imagekit.io/essesion/products/IMG_2272_9pUYs_Eus.jpeg','https://ik.imagekit.io/essesion/products/IMG_2273_CpkhQeoDO.jpeg','https://ik.imagekit.io/essesion/products/IMG_2274_ESuftJMHX.jpeg','https://ik.imagekit.io/essesion/products/IMG_2277_LVS_bU22o.jpeg'], 10, NULL),
  (29, '3F-20260419-007', '프리미엄 실크 blend 핀 닷 와인', 50000, 'https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_ele0ouele0ouele0_M-t_NyYCx.jpeg', '3fold', 'wine', 'dot', 'silk', '프리미엄 실크 blend 핀 닷 와인', ARRAY['https://ik.imagekit.io/essesion/products/Gemini_Generated_Image_ele0ouele0ouele0_M-t_NyYCx.jpeg','https://ik.imagekit.io/essesion/products/IMG_3039_3Z9bRpQGa1.jpeg','https://ik.imagekit.io/essesion/products/IMG_3038_NvsrUTjC6R.jpeg','https://ik.imagekit.io/essesion/products/IMG_3037_F1p4mOrpQ.jpeg','https://ik.imagekit.io/essesion/products/IMG_3036_PAKZTUsme.jpeg','https://ik.imagekit.io/essesion/products/IMG_3035_7D_b2-wxb.jpeg','https://ik.imagekit.io/essesion/products/IMG_3034_DHKatWu5K.jpeg','https://ik.imagekit.io/essesion/products/IMG_3033_2CIacJh1B.jpeg'], 10, NULL);

-- public.product_options: no rows

SELECT setval('public.products_id_seq', COALESCE((SELECT max(id) FROM public.products), 1), true);
