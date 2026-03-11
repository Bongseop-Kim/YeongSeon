import { describe, it } from "vitest";
import type { OrderListRowDTO, OrderViewDTO, OrderDetailRowDTO } from "./order-view";

const ORDER_TYPE = null as unknown as "sale" | "custom" | "repair" | "token";

describe("OrderListRowDTO", () => {
  it("orderType 필드를 포함한다", () => {
    const _test: OrderListRowDTO["orderType"] = ORDER_TYPE;
    void _test;
  });
});

describe("OrderViewDTO", () => {
  it("orderType 필드를 포함한다", () => {
    const _test: OrderViewDTO["orderType"] = ORDER_TYPE;
    void _test;
  });
});

describe("OrderDetailRowDTO", () => {
  it("orderType 필드를 포함한다", () => {
    const _test: OrderDetailRowDTO["orderType"] = ORDER_TYPE;
    void _test;
  });
});
