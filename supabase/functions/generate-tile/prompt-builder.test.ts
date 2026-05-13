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
  assertStringIncludes(prompt, "Yarn-dyed weaving constraints");
  assertStringIncludes(prompt, "no element appears too thin");
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
  assert(!prompt.includes("Yarn-dyed weaving constraints"));
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

Deno.test("variant instruction: 반복 프롬프트에 해석 방향을 추가한다", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "F",
      variation: null,
      motifs: [{ name: "rose", color: null, colors: null }],
      backgroundColor: "ivory",
    },
    "yarn_dyed",
    "none",
    0,
    "Interpret the rose as geometric art deco petal arcs.",
  );

  assertStringIncludes(prompt, "Variant direction");
  assertStringIncludes(prompt, "geometric art deco petal arcs");
  assertStringIncludes(prompt, "2 identical rose");
  assertStringIncludes(prompt, "Yarn-dyed weaving constraints");
});

Deno.test(
  "variant object: 반복 프롬프트에 GenerationSpec 방향을 추가한다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "F",
        variation: null,
        motifs: [{ name: "rose", color: null, colors: null }],
        backgroundColor: "ivory",
      },
      "yarn_dyed",
      "none",
      0,
      {
        id: "variant_1",
        tileLayout: {
          structure: "F",
          variation: null,
          motifs: [{ name: "rose", color: null, colors: null }],
          backgroundColor: "ivory",
        },
        accentLayout: null,
        motifInterpretation: {
          axis: "geometric_abstract",
          description: "Interpret the rose as art deco petal arcs",
          colorEmphasis: "balanced",
        },
        styleDirection: {
          medium: "woven jacquard textile",
          aestheticVector: "restrained luxury",
          density: "balanced",
        },
        referenceImageUsage: "none",
      },
    );

    assertStringIncludes(prompt, "Variant direction");
    assertStringIncludes(prompt, "Motif interpretation");
    assertStringIncludes(prompt, "geometric_abstract");
    assertStringIncludes(prompt, "Interpret the rose as art deco petal arcs");
    assertStringIncludes(prompt, "Style direction");
    assertStringIncludes(prompt, "woven jacquard textile");
    assertStringIncludes(prompt, "2 identical rose");
    assertStringIncludes(prompt, "Yarn-dyed weaving constraints");
  },
);

Deno.test(
  "STRIPE null variation: classic diagonal stripe로 fallback한다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "STRIPE",
        variation: null,
        motifs: [{ name: "navy stripe", color: "navy", colors: null }],
        backgroundColor: "ivory",
      },
      "printed",
    );

    assertStringIncludes(prompt, "classic diagonal necktie stripe");
    assertStringIncludes(prompt, "top-left to bottom-right diagonal");
    assertStringIncludes(prompt, "tile seamlessly");
  },
);

Deno.test(
  "STRIPE textured: 줄마다 twill/jacquard/smooth 질감 지시를 포함한다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "STRIPE",
        variation: "stripe_textured",
        motifs: [
          { name: "navy and burgundy stripe", color: null, colors: null },
        ],
        backgroundColor: "deep navy",
      },
      "yarn_dyed",
    );

    assertStringIncludes(prompt, "textured diagonal stripe");
    assertStringIncludes(prompt, "woven twill");
    assertStringIncludes(prompt, "jacquard-like");
    assertStringIncludes(prompt, "smooth woven silk");
    assertStringIncludes(prompt, "tile seamlessly");
  },
);

Deno.test("STRIPE dotted: stripe 내부 dot/pindot 지시를 포함한다", () => {
  const prompt = buildRepeatPrompt(
    {
      structure: "STRIPE",
      variation: "stripe_dotted",
      motifs: [{ name: "gold pindot stripe", color: "gold", colors: null }],
      backgroundColor: "navy",
    },
    "printed",
  );

  assertStringIncludes(prompt, "diagonal stripe with internal pindot detail");
  assertStringIncludes(prompt, "tiny dots or pindots inside selected stripes");
  assertStringIncludes(prompt, "tile seamlessly");
});

Deno.test(
  "GEOMETRIC null variation: diamond repeat로 fallback하고 placeholder를 남기지 않는다",
  () => {
    const prompt = buildRepeatPrompt(
      {
        structure: "GEOMETRIC",
        variation: null,
        motifs: [{ name: "abstract diamond", color: null, colors: null }],
        backgroundColor: "charcoal",
      },
      "printed",
    );

    assertStringIncludes(prompt, "geometric diamond repeat");
    assertStringIncludes(prompt, "charcoal");
    assert(!prompt.includes("{"));
    assertStringIncludes(prompt, "tile seamlessly");
  },
);

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
  "reference composite motif: 첨부 이미지가 하나면 단수 Image 1로 지시한다",
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
      1,
    );

    assertStringIncludes(prompt, "Use Image 1 as the unified motif reference");
    assert(!prompt.includes("Images 1-1"));
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

Deno.test(
  "accent text: repeat tile reference 위에 seamless 오브젝트 타일을 만든다",
  () => {
    const { prompt } = buildAccentPrompt(
      {
        objectDescription: "a gold anchor",
        objectSource: "text",
        color: null,
        size: "medium",
      },
      "navy blue",
      "yarn_dyed",
      "https://ik.imagekit.io/app/repeat.webp",
      [],
    );
    assertStringIncludes(prompt, "a gold anchor");
    assertStringIncludes(prompt, "navy blue");
    assertStringIncludes(prompt, "Use Image 1 as the exact repeat tile source");
    assertStringIncludes(prompt, "tile seamlessly");
    assertStringIncludes(prompt, "left edge matches right edge");
    assert(!prompt.includes("Plain navy blue covering"));
    assertStringIncludes(prompt, "45%");
    assertStringIncludes(prompt, "Yarn-dyed weaving constraints");
  },
);

Deno.test(
  "accent image: repeat tile을 Image 1, 오브젝트 참조를 Image 2로 전달",
  () => {
    const logoUrl = "https://example.com/logo.png";
    const repeatUrl = "https://ik.imagekit.io/app/repeat.webp";
    const { prompt, referenceImageUrls } = buildAccentPrompt(
      {
        objectDescription: "the attached logo",
        objectSource: "image",
        color: null,
        size: "large",
      },
      "white",
      "printed",
      repeatUrl,
      [logoUrl],
    );
    assertEquals(referenceImageUrls.length, 2);
    assertEquals(referenceImageUrls[0], repeatUrl);
    assertEquals(referenceImageUrls[1], logoUrl);
    assertStringIncludes(prompt, "Use Image 1 as the exact repeat tile source");
    assertStringIncludes(prompt, "Use Image 2 as the object reference");
  },
);

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
    "https://ik.imagekit.io/app/repeat.webp",
    [],
  );
  assertStringIncludes(prompt, "30%");
});
