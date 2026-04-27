import { assertEquals } from "jsr:@std/assert";
import { resolveFabricType } from "./fabric-type-resolver.ts";

Deno.test("채팅 키워드 우선: 자카드 -> yarn_dyed (UI가 printed여도)", () => {
  assertEquals(
    resolveFabricType("printed", "자카드 느낌으로", "printed"),
    "yarn_dyed",
  );
});

Deno.test("채팅 키워드 우선: 날염 -> printed (UI가 yarn_dyed여도)", () => {
  assertEquals(
    resolveFabricType("yarn_dyed", "날염으로 바꿔줘", "yarn_dyed"),
    "printed",
  );
});

Deno.test("UI 선택: 키워드 없을 때 UI 값 사용", () => {
  assertEquals(
    resolveFabricType("yarn_dyed", "스트라이프 패턴", null),
    "yarn_dyed",
  );
});

Deno.test("세션 이전 값 유지: UI/키워드 없을 때", () => {
  assertEquals(resolveFabricType(null, "수정해줘", "yarn_dyed"), "yarn_dyed");
});

Deno.test("기본값: 모두 없으면 printed", () => {
  assertEquals(resolveFabricType(null, "패턴 만들어줘", null), "printed");
});

Deno.test("woven 키워드 -> yarn_dyed", () => {
  assertEquals(resolveFabricType(null, "woven texture", null), "yarn_dyed");
});

Deno.test("print 키워드 -> printed", () => {
  assertEquals(resolveFabricType(null, "print style", null), "printed");
});

Deno.test(
  "yarn-dyed 키워드와 printed 키워드가 함께 있으면 yarn_dyed가 우선한다",
  () => {
    assertEquals(resolveFabricType(null, "woven print", null), "yarn_dyed");
  },
);
