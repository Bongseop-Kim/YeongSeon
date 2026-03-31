import { describe, expect, it } from "vitest";
import {
  ORDER_ROLLBACK_FLOW,
  ORDER_STATUS_FLOW,
} from "@/constants/order-status";

describe("ORDER_ROLLBACK_FLOW", () => {
  it("결제중 상태 주문은 대기중으로 롤백할 수 있다", () => {
    expect(ORDER_ROLLBACK_FLOW.sale["결제중"]).toBe("대기중");
    expect(ORDER_ROLLBACK_FLOW.custom["결제중"]).toBe("대기중");
    expect(ORDER_ROLLBACK_FLOW.token["결제중"]).toBe("대기중");
    expect(ORDER_ROLLBACK_FLOW.sample["결제중"]).toBe("대기중");
  });

  it("sample 롤백 대상은 sample 전방 상태 흐름에 존재한다", () => {
    const rollbackTarget = ORDER_ROLLBACK_FLOW.sample["결제중"];

    expect(rollbackTarget).toBeDefined();
    expect(rollbackTarget).toBe("대기중");
    expect(ORDER_STATUS_FLOW.sample[rollbackTarget]).toBeDefined();
  });
});
