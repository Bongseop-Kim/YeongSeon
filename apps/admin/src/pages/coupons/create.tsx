import { Text } from "seed-design/ui/text";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Callout } from "seed-design/ui/callout";
import { CouponForm, useCreateCouponMutation } from "@/features/coupons";
import {
  createDefaultCouponFormValues,
  type AdminCouponFormValues,
} from "@/features/coupons";
import "@/features/coupons/components/coupon-admin.css";

const DEFAULT_COUPON_FORM_VALUES = createDefaultCouponFormValues();

export default function CouponCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const mutation = useCreateCouponMutation();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<AdminCouponFormValues>({
    defaultValues: DEFAULT_COUPON_FORM_VALUES,
  });
  const dirtyCount = Object.keys(dirtyFields).length;

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: () =>
        navigate({ pathname: "/coupons", search: location.search }),
    });
  });

  return (
    <main className="couponPage adminSettingsPage">
      <header className="couponPageHeader">
        <div className="couponPageTitleGroup">
          <Text as="h1" textStyle="screenTitle" className="couponPageTitle">
            쿠폰 생성
          </Text>
          <Text as="p" textStyle="t4Regular" className="couponPageDescription">
            관리자 쿠폰을 생성합니다.
          </Text>
        </div>
      </header>

      {mutation.error ? (
        <Callout
          tone="critical"
          description={mutation.error.message}
          role="alert"
        />
      ) : null}

      <section
        className="couponPanel adminSettingsCard"
        aria-labelledby="coupon-create-form-title"
      >
        <Text
          as="h2"
          textStyle="t6Bold"
          id="coupon-create-form-title"
          className="couponPanelTitle"
        >
          기본 정보
        </Text>
        <form onSubmit={onSubmit} noValidate>
          <CouponForm
            control={control}
            errors={errors}
            submitting={mutation.isPending}
            submitLabel="생성"
            isDirty={isDirty}
            dirtyCount={dirtyCount}
            onCancel={() => reset(DEFAULT_COUPON_FORM_VALUES)}
          />
        </form>
      </section>
    </main>
  );
}
