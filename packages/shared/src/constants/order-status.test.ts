import { describe, expect, it } from "vitest";
import { ORDER_ROLLBACK_FLOW } from "@/constants/order-status";

describe("ORDER_ROLLBACK_FLOW", () => {
  it("결제중 상태 주문은 대기중으로 롤백할 수 있다", () => {
    expect(ORDER_ROLLBACK_FLOW.sale["결제중"]).toBe("대기중");
    expect(ORDER_ROLLBACK_FLOW.custom["결제중"]).toBe("대기중");
    expect(ORDER_ROLLBACK_FLOW.token["결제중"]).toBe("대기중");
    expect(ORDER_ROLLBACK_FLOW.sample["결제중"]).toBe("대기중");
  });
});
