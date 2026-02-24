# 클레임 백엔드 설계

스키마: `supabase/schemas/60_claims.sql`, `supabase/schemas/91_functions.sql`

## 설계 결정

### user_id 비정규화
`claims.user_id`를 직접 저장하여 RLS에서 `orders` JOIN 없이 `auth.uid() = user_id`로 체크.
쓰기 시 `create_claim()` RPC가 소유권을 보장하므로 불일치 불가.

### order_item_id UUID 변환
프론트엔드는 `order_items.item_id` (text)를 사용하지만, FK는 `order_items.id` (UUID PK)를 참조.
`create_claim()` RPC 내부에서 `item_id` → `id` 변환 수행.

### Advisory Lock 키 분리
`generate_claim_number()`는 `hashtext('CLM' || date_str)` 사용.
`generate_order_number()`는 `hashtext(date_str)` 사용.
서로 다른 lock 키로 간섭 없음.

### 클레임 번호 시퀀스 추출
`CLM-YYYYMMDD-NNN` 형식에서 `substring(claim_number from 14)`로 NNN 추출.
`CLM-YYYYMMDD-` = 13자이므로 14번째부터가 시퀀스.

---

## 스키마 요약

### claims 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK → auth.users | RLS 필터용 비정규화 |
| order_id | uuid FK → orders | 원본 주문 |
| order_item_id | uuid FK → order_items | 클레임 대상 아이템 |
| claim_number | varchar(50) UNIQUE | CLM-YYYYMMDD-NNN |
| type | text | cancel / return / exchange |
| status | text | 접수 / 처리중 / 완료 / 거부 |
| reason | text | change_mind, defect 등 7종 |
| description | text (nullable) | 상세 설명 |
| quantity | integer | > 0, 부분 클레임 지원 |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now(), trigger 자동 갱신 |

### RLS 정책
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id` (WITH CHECK)
- UPDATE/DELETE: 없음 (관리자 RPC로 향후 처리)

### RPC
- `create_claim(p_type, p_order_id, p_item_id, p_reason, p_description?, p_quantity?)` → `{claim_id, claim_number}`
- SECURITY DEFINER, authenticated/service_role only

### View
- `claim_list_view` (security_invoker = true)
- 이중 보안: `cl.user_id = auth.uid()` WHERE + `o.user_id = auth.uid()` JOIN

---

## 검증 절차

### 1. 스키마 검증 (supabase db reset 후)

```sql
-- 테이블 존재 + RLS 활성화
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'claims';

-- RLS 정책 확인
SELECT polname, polcmd, polpermissive
FROM pg_policy
WHERE polrelid = 'public.claims'::regclass;

-- 제약조건 확인
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.claims'::regclass;

-- 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'claims';
```

### 2. 기능 검증

```sql
-- 클레임 번호 생성 테스트
SELECT generate_claim_number();

-- 비인증 상태에서 뷰 접근 → 0 rows
SELECT count(*) FROM claim_list_view;

-- 비인증 상태에서 create_claim → Unauthorized 에러
SELECT create_claim('cancel', gen_random_uuid(), 'test', 'change_mind');
```

### 3. RLS 검증

```sql
-- 비인증 사용자: claims 직접 SELECT → 0 rows (RLS 차단)
-- 비인증 사용자: claims INSERT → 실패 (RLS WITH CHECK)
-- 인증 사용자: 타인 클레임 SELECT → 0 rows
-- 인증 사용자: create_claim으로 타인 주문 → 'Order not found' 에러
```

### 4. E2E 시나리오 (실제 auth 유저 필요)

1. 주문 생성 → `create_order_txn(...)`
2. 클레임 접수 → `create_claim('cancel', order_id, item_id, 'change_mind')`
3. 클레임 조회 → `SELECT * FROM claim_list_view`
4. 중복 클레임 → `create_claim` 재호출 → `Active claim already exists` 에러
