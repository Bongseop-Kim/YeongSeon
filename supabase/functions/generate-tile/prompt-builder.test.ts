import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { buildAccentPrompt, buildRepeatPrompt } from "./prompt-builder.ts";

Deno.test("H + yarn_dyed: 모티프/배경/원단블록/seamless 포함", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "H",
      variation: null,
      motifs: [{ name: "anchor", color: null, colors: null }],
      backgroundColor: "navy blue",
    },
    "yarn_dyed",
  );
  assertStringIncludes(prompt, "anchor");
  assertStringIncludes(prompt, "navy blue");
  assertStringIncludes(prompt, "yarn-dyed");
  assertStringIncludes(prompt, "tile seamlessly");
  assertStringIncludes(prompt, "45%");
});

Deno.test("F + printed: 모티프 2개 배치 명시", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "F",
      variation: null,
      motifs: [{ name: "cherry", color: null, colors: null }],
      backgroundColor: "white",
    },
    "printed",
  );
  assertStringIncludes(prompt, "2 identical cherry");
  assertStringIncludes(prompt, "upper-left quadrant");
  assertStringIncludes(prompt, "lower-right quadrant");
  assertStringIncludes(prompt, "tile seamlessly");
});

Deno.test("Q-color: 두 색상 치환", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "Q",
      variation: "color",
      motifs: [{ name: "star", color: null, colors: ["gold", "silver"] }],
      backgroundColor: "black",
    },
    "printed",
  );
  assertStringIncludes(prompt, "gold");
  assertStringIncludes(prompt, "silver");
});

Deno.test("Q-color: 색상 분석이 누락되어도 placeholder를 남기지 않는다", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "Q",
      variation: "color",
      motifs: [{ name: "star", color: null, colors: null }],
      backgroundColor: "black",
    },
    "printed",
  );

  assert(!prompt.includes("{COLOR_A}"));
  assert(!prompt.includes("{COLOR_B}"));
});

Deno.test("Q-different_motif: 두 모티프 치환", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "Q",
      variation: "different_motif",
      motifs: [
        { name: "anchor", color: null, colors: null },
        { name: "wheel", color: null, colors: null },
      ],
      backgroundColor: "white",
    },
    "printed",
  );
  assertStringIncludes(prompt, "anchor");
  assertStringIncludes(prompt, "wheel");
});

Deno.test(
  "reference single motif: 첨부 이미지 1개를 반복 모티프로 지시한다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "F",
        variation: null,
        motifs: [{ name: "reference motif", color: null, colors: null }],
        backgroundColor: "white",
      },
      "printed",
      "single_motif",
      1,
    );

    assertStringIncludes(prompt, "Use Image 1 as the motif reference");
  },
);

Deno.test(
  "reference composite motif: 여러 첨부 이미지를 하나의 모티프로 조합하도록 지시한다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "F",
        variation: null,
        motifs: [{ name: "combined motif", color: null, colors: null }],
        backgroundColor: "white",
      },
      "printed",
      "composite_motif",
      2,
    );

    assertStringIncludes(prompt, "Combine Images 1-2 into one unified motif");
  },
);

Deno.test(
  "reference multiple motifs: 첨부 이미지 두 개를 MOTIF_A/MOTIF_B로 지시한다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "Q",
        variation: "different_motif",
        motifs: [
          { name: "reference motif A", color: null, colors: null },
          { name: "reference motif B", color: null, colors: null },
        ],
        backgroundColor: "white",
      },
      "printed",
      "multiple_motifs",
      2,
    );

    assertStringIncludes(prompt, "Use Image 1 as MOTIF_A");
    assertStringIncludes(prompt, "Use Image 2 as MOTIF_B");
  },
);

Deno.test(
  "reference repeat_and_accent: 첨부 이미지가 하나면 Image 2를 언급하지 않는다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "F",
        variation: null,
        motifs: [{ name: "reference motif", color: null, colors: null }],
        backgroundColor: "white",
      },
      "printed",
      "repeat_and_accent",
      1,
    );

    assertStringIncludes(prompt, "Use Image 1 as the repeat-pattern motif");
    assert(!prompt.includes("Image 2"));
  },
);

Deno.test(
  "Q: variation이 누락되어도 different motif placeholder를 남기지 않는다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "Q",
        variation: null,
        motifs: [{ name: "anchor", color: null, colors: null }],
        backgroundColor: "white",
      },
      "printed",
    );

    assert(!prompt.includes("{MOTIF_A}"));
    assert(!prompt.includes("{MOTIF_B}"));
  },
);

Deno.test("accent text: seamless suffix 없음, 오브젝트 설명 포함", () => {
  const { prompt } = buildAccentPrompt(
    {
      objectDescription: "a gold anchor",
      objectSource: "text",
      color: null,
      size: "medium",
    },
    "navy blue",
    "yarn_dyed",
    [],
  );
  assertStringIncludes(prompt, "a gold anchor");
  assertStringIncludes(prompt, "navy blue");
  assert(
    !prompt.includes("tile seamlessly"),
    "seamless suffix must not appear in accent",
  );
  assertStringIncludes(prompt, "45%");
});

Deno.test("accent image: referenceImageUrls 전달", () => {
  const logoUrl = "https://example.com/logo.png";
  const { referenceImageUrls } = buildAccentPrompt(
    {
      objectDescription: "the attached logo",
      objectSource: "image",
      color: null,
      size: "large",
    },
    "white",
    "printed",
    [logoUrl],
  );
  assertEquals(referenceImageUrls.length, 1);
  assertEquals(referenceImageUrls[0], logoUrl);
  assertStringIncludes(referenceImageUrls[0] ?? "", "example.com");
});

Deno.test("accent small size -> 30%", () => {
  const { prompt } = buildAccentPrompt(
    {
      objectDescription: "dot",
      objectSource: "text",
      color: null,
      size: "small",
    },
    "red",
    "printed",
    [],
  );
  assertStringIncludes(prompt, "30%");
});
