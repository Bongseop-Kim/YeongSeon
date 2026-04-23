# AI 생성 로그 페이지 디자인 스펙

**날짜:** 2026-04-23  
**브랜치:** debug/design  
**작성 배경:** 생성 경로의 아티팩트 미저장, source_original 오기록, 메인 로그 조회에 아티팩트 미포함 등의 문제를 해결한 뒤, 관리자가 워크플로 전 단계 이미지를 한 화면에서 추적할 수 있도록 UI를 재설계한다.

---

## 1. 범위

| 화면          | 경로                   | 변경 내용                                                      |
| ------------- | ---------------------- | -------------------------------------------------------------- |
| 리스트 페이지 | `/generation-logs`     | 필터 강화, 통계 접기/펼치기, 테이블 행 클릭 → 상세 페이지 이동 |
| 상세 페이지   | `/generation-logs/:id` | 신규 — 별도 라우트, sticky 요약 바 + 아티팩트 타임라인 중심    |

현재 리스트 페이지의 모달 상세(`GenerationLogDetail`, `GenerationLogArtifactTimeline`)는 상세 페이지로 이전되어 모달은 제거된다.

---

## 2. 리스트 페이지 `/generation-logs`

### 2-1. 전체 구조 (위→아래)

```text
KPI 카드 4개 (항상 표시)
통계 접기/펼치기 토글 바
  └─ [펼쳤을 때] 모델별·유형별·에러별·패턴별 통계
필터 바
  날짜 범위 / 모델 / 요청 유형 / 상태 / ID 검색
로그 테이블
페이지네이션
```

### 2-2. KPI 카드

항상 표시. 선택된 날짜 범위 기준.

| 카드           | 값   | 추세         |
| -------------- | ---- | ------------ |
| 총 생성 요청   | N건  | 전주 대비 ±% |
| 이미지 성공률  | N.N% | ±%p          |
| 총 토큰 소비   | NM   | 기간 표시    |
| 평균 응답 시간 | Nms  | ±ms          |

### 2-3. 통계 패널

**기본값: 접힘.** 토글 바 클릭으로 펼침/접음. 로컬스토리지로 상태 유지(선택 사항).  
기존 `DesignContextStats` 컴포넌트를 재사용한다.

### 2-4. 필터 바

| 필터      | 구현                                                            | 비고                                            |
| --------- | --------------------------------------------------------------- | ----------------------------------------------- |
| 날짜 범위 | DateRangeFilter (기존)                                          | 기본값 최근 7일                                 |
| 모델      | Select (openai / fal / 전체)                                    | 기존                                            |
| 요청 유형 | Select (analysis / prep / render_standard / render_high / 전체) | 신규                                            |
| 상태      | Select (성공 / 에러 / 전체)                                     | 신규                                            |
| ID 검색   | Text input                                                      | workflow_id 또는 work_id exact match 검색, 신규 |

필터 변경 시 페이지를 1로 리셋한다.

### 2-5. 테이블 컬럼

| 컬럼      | 너비  | 비고                               |
| --------- | ----- | ---------------------------------- |
| 시각      | 120px | MM-DD HH:mm:ss                     |
| 모델      | 76px  | 색상 태그                          |
| 요청 유형 | 108px | 색상 태그 (분석/보정/렌더)         |
| 프롬프트  | flex  | ellipsis                           |
| 토큰      | 64px  | right-align, 환불 있으면 (-N) 표시 |
| 응답(ms)  | 80px  | right-align                        |
| 상태      | 88px  | 성공 / 에러 태그                   |

행 클릭 시 `/generation-logs/:id`로 이동 (push). 커서: pointer.

---

## 3. 상세 페이지 `/generation-logs/:id`

라우트 파라미터 `id`는 `ai_generation_logs.id` (UUID).

### 3-1. 전체 구조 (위→아래)

```text
Sticky 요약 바
  ← 생성 로그 / 날짜·모델·유형
  [모델 태그] · [유형 태그] · 토큰 N · 응답 Nms · [상태 태그] · workflow_id (우측 정렬)

섹션 1: 기본 정보 카드 (2×4 그리드)
섹션 2: 생성된 이미지 카드
섹션 3: 아티팩트 타임라인 카드 ← 핵심
섹션 4: 프롬프트 & AI 응답 카드 (좌우 2단)
섹션 5: 디자인 컨텍스트 & 감지 결과 카드
```

### 3-2. Sticky 요약 바

`position: sticky; top: 0; z-index: 10;` 적용. 흰 배경, 하단 border.  
스크롤해도 모델·상태·토큰이 항상 보인다.

### 3-3. 섹션 1 — 기본 정보

8칸 그리드 (4열×2행):
CI 이미지 유무 / 레퍼런스 이미지 유무 / 이전 이미지 유무 / 대화 턴 /
프롬프트 길이 / 이미지 생성 요청 여부 / 텍스트 API ms / 이미지 API ms

### 3-4. 섹션 2 — 생성된 이미지

`generatedImageUrl`이 있으면 전체 너비 `<img>`. 없으면 "이미지 없음 (단계명)" placeholder.

### 3-5. 섹션 3 — 아티팩트 타임라인 (핵심 섹션)

`workflowId`가 있을 때만 `admin_get_generation_log_artifacts(workflow_id)` 호출.

**표시 형태:** 분석 → 보정 → 렌더 순서로 phase 그룹을 가로 배치. 화살표(→)로 연결.  
각 아티팩트 노드:

- 썸네일 이미지 (90×90, `imageUrl` 있으면 실제 이미지, 없으면 placeholder)
- artifactType 라벨
- status 태그 (success / partial / failed)

**workflow_id 없음 안내:**  
단일 렌더 로그는 workflow_id가 없으므로 타임라인 대신 안내 문구 표시:

> "이 로그는 workflow와 연결되지 않아 아티팩트 추적이 불가합니다."

### 3-6. 섹션 4 — 프롬프트 & AI 응답

좌우 2단. 각각 접이식(최대 높이 제한 + "더 보기" 링크).  
`textPrompt` / `imagePrompt` / `imageEditPrompt`가 있으면 사용자 프롬프트 아래 별도 표시.

### 3-7. 섹션 5 — 디자인 컨텍스트 & 감지 결과

`designContext`, `detectedDesign`, `normalizedDesign`, `missingRequirements`를 구조화된 그리드로 표시. 기존 raw JSON 코드블록 대신 key-value 형태.  
`eligibilityReason`, `errorMessage`는 전체 너비 텍스트 박스.

---

## 4. 라우팅

```text
/generation-logs        → 리스트 페이지 (기존 list.tsx 수정)
/generation-logs/:id    → 상세 페이지 (신규 detail.tsx)
```

React Router (기존 라우터 방식 따름).

---

## 5. 데이터 페칭

| 페이지        | 쿼리                                          | 기존 여부        |
| ------------- | --------------------------------------------- | ---------------- |
| 리스트        | `useGenerationLogsQuery` (필터 파라미터 확장) | 기존 + 확장      |
| 리스트        | `useGenerationStatsQuery`                     | 기존             |
| 상세          | `useGenerationLogDetailQuery(id)`             | 신규 — 단건 조회 |
| 상세 아티팩트 | `useGenerationLogArtifactsQuery(workflowId)`  | 기존             |

단건 조회는 기존 `admin_get_generation_logs` RPC에 id 필터를 추가하거나, 별도 RPC `admin_get_generation_log_by_id`를 신설한다.

---

## 6. 컴포넌트 재사용 / 변경 계획

| 컴포넌트                        | 변경 내용                                        |
| ------------------------------- | ------------------------------------------------ |
| `GenerationLogTable`            | 행 클릭 → 라우터 navigate, 모달 제거             |
| `GenerationLogArtifactTimeline` | 상세 페이지로 이동, UI 확장 (썸네일 실제 이미지) |
| `GenerationLogDetail` (인라인)  | 별도 `generation-log-detail.tsx`로 분리          |
| `DesignContextStats`            | 리스트 페이지 통계 패널 안으로 이동, 기본 접힘   |
| `DateRangeFilter`               | 기존 재사용                                      |

신규:

- `pages/generation-logs/detail.tsx` — 상세 페이지
- `features/generation-logs/components/generation-log-detail-page.tsx`
- `features/generation-logs/api/generation-log-detail-query.ts`

---

## 7. 결정 사항

1. **단건 RPC 방식**: 기존 `admin_get_generation_logs`에 `p_id uuid DEFAULT NULL` 파라미터 추가. 배열 반환 구조 유지, 프론트에서 `[0]` 사용. 신규 RPC 불필요.
2. **요청 유형 / 상태 필터**: 백엔드 RPC에 `p_request_type text DEFAULT NULL`, `p_error_type text DEFAULT NULL` 파라미터 추가. 상태 필터는 `p_error_type = 'none'`이면 `error_type IS NULL` 조건으로 처리.
3. **ID 검색**: workflow_id / work_id 모두 **exact match**. prefix 검색은 인덱스 부담 대비 실용성이 낮음.
4. **통계 패널 토글 상태 유지**: localStorage 미사용. 매 접속 시 기본값 접힘으로 충분.
