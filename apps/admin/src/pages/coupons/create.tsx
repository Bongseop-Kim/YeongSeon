import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Callout } from "seed-design/ui/callout";
import { CouponForm, useCreateCouponMutation } from "@/features/coupons";
import {
  createDefaultCouponFormValues,
  type AdminCouponFormValues,
} from "@/features/coupons";
import "@/features/coupons/components/coupon-admin.css";

export default function CouponCreate() {
  const navigate = useNavigate();
  const mutation = useCreateCouponMutation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminCouponFormValues>({
    defaultValues: createDefaultCouponFormValues(),
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: () => navigate("/coupons"),
    });
  });

  return (
    <main className="couponPage">
      <header className="couponPageHeader">
        <div className="couponPageTitleGroup">
          <h1 className="couponPageTitle">쿠폰 생성</h1>
          <p className="couponPageDescription">관리자 쿠폰을 생성합니다.</p>
        </div>
      </header>

      {mutation.error ? (
        <Callout tone="critical" description={mutation.error.message} />
      ) : null}

      <section
        className="couponPanel"
        aria-labelledby="coupon-create-form-title"
      >
        <h2 id="coupon-create-form-title" className="couponPanelTitle">
          기본 정보
        </h2>
        <form onSubmit={onSubmit} noValidate>
          <CouponForm
            control={control}
            errors={errors}
            submitting={mutation.isPending}
            submitLabel="생성"
            onCancel={() => navigate("/coupons")}
          />
        </form>
      </section>
    </main>
  );
}
