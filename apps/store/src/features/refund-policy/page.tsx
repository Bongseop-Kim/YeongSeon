import {
  PolicyPageLayout,
  PolicySection,
  PolicyList,
} from "@/features/policy/components/policy-components";

export default function RefundPolicyPage() {
  return (
    <PolicyPageLayout title="환불정책">
      <PolicySection title="1. 환불 및 교환 안내">
        <p>
          영선산업(서비스명: ESSE SION, 이하 "회사")은 고객님의 만족을
          최우선으로 생각하며, 구매하신 상품에 문제가 있을 경우 신속하고 공정한
          환불 및 교환을 진행합니다. 단, 상품의 특성상 제작 주문 상품의 경우
          환불 및 교환이 제한될 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="2. 환불 및 교환 가능 기간">
        <PolicyList>
          <li>상품 수령일로부터 7일 이내 환불 및 교환 신청이 가능합니다.</li>
          <li>
            단, 상품의 내용을 확인하기 위하여 포장을 훼손한 경우에는 상품의
            확인이 불가능하여 환불 및 교환이 불가능할 수 있습니다.
          </li>
          <li>
            제작 주문 상품의 경우, 제작 진행 단계에 따라 환불 가능 여부 및
            환불액이 달라질 수 있습니다. 자세한 내용은 제9조를 참조하십시오.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="3. 환불 및 교환 불가 사유">
        <p>다음의 경우에는 환불 및 교환이 불가능합니다.</p>
        <PolicyList>
          <li>고객님의 책임 있는 사유로 상품 등이 멸실 또는 훼손된 경우</li>
          <li>
            고객님의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한
            경우
          </li>
          <li>
            시간의 경과에 의하여 재판매가 곤란할 정도로 상품 등의 가치가 현저히
            감소한 경우
          </li>
          <li>
            맞춤 제작 상품의 경우, 샘플 승인 이후 제작이 진행된 단계에서는 단순
            변심에 의한 취소 및 환불이 불가능합니다.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="4. 환불 방법">
        <p>환불은 다음의 방법으로 진행됩니다.</p>
        <PolicyList>
          <li>
            신용카드로 결제하신 경우: 신용카드 승인 취소를 통한 환불 (영업일
            기준 3~5일 소요)
          </li>
          <li>
            계좌이체로 결제하신 경우: 환불 계좌로 입금 (영업일 기준 1~2일 소요)
          </li>
          <li>
            무통장입금으로 결제하신 경우: 환불 계좌로 입금 (영업일 기준 1~2일
            소요)
          </li>
          <li>
            환불 시 배송비는 상품의 하자 또는 오배송의 경우에만 환불되며, 단순
            변심의 경우 배송비는 환불되지 않습니다.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="5. 교환 방법">
        <p>
          교환을 원하시는 경우, 고객센터로 연락 주시면 교환 절차를 안내해
          드립니다. 교환 배송비는 상품의 하자 또는 오배송의 경우 회사가
          부담하며, 단순 변심의 경우 고객님께서 부담하셔야 합니다.
        </p>
      </PolicySection>

      <PolicySection title="6. 반품 배송비">
        <PolicyList>
          <li>
            상품의 하자 또는 오배송의 경우: 반품 배송비는 회사가 부담합니다.
          </li>
          <li>단순 변심의 경우: 반품 배송비는 고객님께서 부담하셔야 합니다.</li>
          <li>
            반품 시 초기 배송비가 무료였던 경우, 반품 배송비와 함께 초기
            배송비가 차감될 수 있습니다.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="7. 환불 지연에 대한 배상">
        <p>
          회사는 환불 처리를 지연한 경우, 지연 기간에 대하여 「전자상거래법」
          시행령 제21조의3에서 정하는 이율(연 100분의 20)을 곱하여 산정한
          지연배상금을 지급합니다.
        </p>
      </PolicySection>

      <PolicySection title="8. 환불 및 교환 신청 방법">
        <p>
          환불 및 교환을 원하시는 경우 다음의 방법으로 신청하실 수 있습니다.
        </p>
        <PolicyList>
          <li>고객센터 전화 또는 이메일 문의</li>
          <li>마이페이지의 주문 내역에서 환불/교환 신청</li>
          <li>
            환불 및 교환 신청 시 주문번호, 상품명, 환불/교환 사유를 명시해주시기
            바랍니다.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="9. 서비스 유형별 환불 규정">
        <p>서비스 유형에 따라 다음과 같은 환불 규정이 적용됩니다.</p>

        <p className="mt-3 font-medium">■ 일반 상품 주문</p>
        <PolicyList>
          <li>결제 완료 후 배송 시작 전: 전액 환불</li>
          <li>
            배송 시작 후: 반품 후 환불 (반품 배송비 고객 부담, 상품 하자 시 회사
            부담)
          </li>
          <li>배송 완료 후 7일 이내: 반품 접수 후 환불 가능</li>
        </PolicyList>

        <p className="mt-3 font-medium">■ 수선(Reform) 주문</p>
        <PolicyList>
          <li>결제 완료 후 발송 전(대기중/발송대기 상태): 전액 환불</li>
          <li>발송 중 상태: 반품 배송비를 공제한 금액 환불</li>
          <li>
            수선 완료 후: 상품 하자가 있는 경우에 한해 환불 또는 재수선 가능
          </li>
        </PolicyList>

        <p className="mt-3 font-medium">■ 맞춤 제작(Custom Order) 주문</p>
        <PolicyList>
          <li>접수 단계까지(샘플 제작 시작 전): 전액 환불</li>
          <li>
            샘플 제작 단계(샘플원단제작중 ~ 샘플승인): 샘플 제작 비용을 공제한
            금액 환불
          </li>
          <li>
            샘플 승인 후 제작 진행 중: 단순 변심에 의한 취소 불가. 단, 제작
            상품에 하자가 있는 경우 환불 또는 재제작 가능
          </li>
          <li>
            맞춤 제작 상품의 경우, 고객님의 요청사항에 따라 제작된 상품은 단순
            변심에 의한 교환이 불가능합니다.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="10. AI 디자인 토큰 환불 규정">
        <p>
          AI 디자인 서비스 이용을 위해 구매하는 디자인 토큰의 환불은 다음 규정에
          따릅니다.
        </p>
        <PolicyList>
          <li>
            유료(paid) 토큰: 구매 후 미사용 잔액에 한하여 고객센터를 통해 수동
            환불 신청이 가능합니다. 전자상거래 등에서의 소비자보호에 관한 법률에
            따릅니다.
          </li>
          <li>
            무료(bonus) 토큰: 신규 가입 지급, 이벤트 지급 등 무상으로 취득한
            토큰은 환불 대상이 아닙니다.
          </li>
          <li>
            AI 이미지 생성에 실패한 경우: 차감된 토큰은 자동으로 복원됩니다.
          </li>
          <li>
            사용 완료된 토큰(이미지 생성에 사용된 토큰)은 환불되지 않습니다.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection title="11. 기타">
        <p>
          이 환불정책에서 정하지 않은 사항은 관련 법령 및 회사의 이용약관에
          따릅니다. 환불 및 교환에 대한 문의사항이 있으시면 고객센터로
          연락주시기 바랍니다.
        </p>
      </PolicySection>

      <PolicySection title="12. 정책의 시행일">
        <p>
          이 환불정책은 2024년 1월 1일부터 시행되며, 정책의 변경이 있는 경우
          변경된 내용과 시행일을 명시하여 서비스의 초기화면에 그 시행일 7일
          이전부터 시행일 후 상당한 기간 동안 공지합니다.
        </p>
      </PolicySection>
    </PolicyPageLayout>
  );
}
