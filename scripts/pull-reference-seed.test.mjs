import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReferenceSeedSql,
  escapeSqlLiteral,
  serializeSqlValue,
} from "./pull-reference-seed.mjs";

test("escapeSqlLiteral escapes single quotes", () => {
  assert.equal(escapeSqlLiteral("Kid's tie"), "'Kid''s tie'");
});

test("serializeSqlValue handles nulls, numbers, arrays, and objects", () => {
  assert.equal(serializeSqlValue(null), "NULL");
  assert.equal(serializeSqlValue(12000), "12000");
  assert.equal(
    serializeSqlValue([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]),
    "ARRAY['https://example.com/a.jpg','https://example.com/b.jpg']",
  );
  assert.equal(
    serializeSqlValue({ color: "navy", label: "네이비" }),
    `'{"color":"navy","label":"네이비"}'::jsonb`,
  );
});

test("buildReferenceSeedSql emits allowlisted tables in dependency order", () => {
  const sql = buildReferenceSeedSql({
    admin_settings: [
      { key: "default_courier_company", value: "CJ대한통운", updated_by: "x" },
    ],
    pricing_constants: [
      {
        key: "token_plan_starter_price",
        amount: 9900,
        category: "token",
        updated_by: "x",
      },
    ],
    products: [
      {
        id: 10,
        code: "YS-DEV-001",
        name: "Kid's Navy Tie",
        price: 39000,
        image: "https://example.com/tie.jpg",
        category: "3fold",
        color: "navy",
        pattern: "solid",
        material: "silk",
        info: "sample",
        detail_images: ["https://example.com/detail.jpg"],
        stock: 20,
        option_label: null,
      },
    ],
    product_options: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        product_id: 10,
        name: "기본",
        additional_price: 0,
        stock: 20,
      },
    ],
  });

  assert.match(
    sql,
    /TRUNCATE TABLE public\.product_options, public\.products, public\.pricing_constants, public\.admin_settings RESTART IDENTITY CASCADE;/,
  );
  assert.ok(
    sql.indexOf("INSERT INTO public.admin_settings") <
      sql.indexOf("INSERT INTO public.pricing_constants"),
  );
  assert.ok(
    sql.indexOf("INSERT INTO public.products") <
      sql.indexOf("INSERT INTO public.product_options"),
  );
  assert.doesNotMatch(sql, /updated_by/);
  assert.match(sql, /'Kid''s Navy Tie'/);
});
