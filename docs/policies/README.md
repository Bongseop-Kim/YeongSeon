---
tags:
  - index
  - policy
---

# 정책 문서

여러 도메인에 걸치는 횡단 관심사 정책 모음.

| 문서             | 설명                                       | 영향 도메인                        | 상태        |
| ---------------- | ------------------------------------------ | ---------------------------------- | ----------- |
| [[payment]]      | Toss 결제 흐름, 멱등성, 실패 복구          | sale, repair, custom-order, design | implemented |
| [[coupon]]       | 쿠폰 할인 계산, 생명주기, 상한 처리        | sale, repair, custom-order         | implemented |
| [[token]]        | 디자인 토큰 원장, 구매 패키지, 동시성 제어 | design                             | implemented |
| [[notification]] | 알림 이벤트 및 채널 (향후 구현 예정)       | 전체                               | planned     |

도메인 스펙은 `docs/domains/`를 참조.
