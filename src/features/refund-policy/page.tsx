import { PopupLayout } from "@/components/layout/popup-layout";

export default function RefundPolicyPage() {
  return (
    <PopupLayout
      title="환불정책"
      onClose={() => window.close()}
      contentClassName="px-4"
    >
      <div className="space-y-6 text-sm text-muted-foreground whitespace-pre-line">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            1. 환불 및 교환 안내
          </h2>
          <p>
            ESSE SION(이하 "회사")은 고객님의 만족을 최우선으로 생각하며,
            구매하신 상품에 문제가 있을 경우 신속하고 공정한 환불 및 교환을
            진행합니다. 단, 상품의 특성상 제작 주문 상품의 경우 환불 및 교환이
            제한될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            2. 환불 및 교환 가능 기간
          </h2>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>상품 수령일로부터 7일 이내 환불 및 교환 신청이 가능합니다.</li>
            <li>
              단, 상품의 내용을 확인하기 위하여 포장을 훼손한 경우에는 상품의
              확인이 불가능하여 환불 및 교환이 불가능할 수 있습니다.
            </li>
            <li>
              제작 주문 상품의 경우, 제작 시작 전까지만 취소 및 환불이
              가능합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            3. 환불 및 교환 불가 사유
          </h2>
          <p>다음의 경우에는 환불 및 교환이 불가능합니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>고객님의 책임 있는 사유로 상품 등이 멸실 또는 훼손된 경우</li>
            <li>
              고객님의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한
              경우
            </li>
            <li>
              시간의 경과에 의하여 재판매가 곤란할 정도로 상품 등의 가치가
              현저히 감소한 경우
            </li>
            <li>
              복제가 가능한 상품 등의 포장을 훼손한 경우 (CD, DVD, 소프트웨어
              등)
            </li>
            <li>
              제작 주문 상품의 경우, 제작이 시작된 이후에는 취소 및 환불이
              불가능합니다.
            </li>
            <li>
              주문 확인 후 상품의 제작이 시작된 경우, 단순 변심에 의한 취소가
              불가능합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            4. 환불 방법
          </h2>
          <p>환불은 다음의 방법으로 진행됩니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>
              신용카드로 결제하신 경우: 신용카드 승인 취소를 통한 환불 (영업일
              기준 3~5일 소요)
            </li>
            <li>
              계좌이체로 결제하신 경우: 환불 계좌로 입금 (영업일 기준 1~2일
              소요)
            </li>
            <li>
              무통장입금으로 결제하신 경우: 환불 계좌로 입금 (영업일 기준 1~2일
              소요)
            </li>
            <li>
              환불 시 배송비는 상품의 하자 또는 오배송의 경우에만 환불되며, 단순
              변심의 경우 배송비는 환불되지 않습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            5. 교환 방법
          </h2>
          <p>
            교환을 원하시는 경우, 고객센터로 연락 주시면 교환 절차를 안내해
            드립니다. 교환 배송비는 상품의 하자 또는 오배송의 경우 회사가
            부담하며, 단순 변심의 경우 고객님께서 부담하셔야 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            6. 반품 배송비
          </h2>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>
              상품의 하자 또는 오배송의 경우: 반품 배송비는 회사가 부담합니다.
            </li>
            <li>
              단순 변심의 경우: 반품 배송비는 고객님께서 부담하셔야 합니다.
            </li>
            <li>
              반품 시 초기 배송비가 무료였던 경우, 반품 배송비와 함께 초기
              배송비가 차감될 수 있습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            7. 환불 지연에 대한 배상
          </h2>
          <p>
            회사는 환불 처리를 지연한 경우, 지연 기간에 대하여 「전자상거래법」
            시행령 제21조의3에서 정하는 이율(연 100분의 20)을 곱하여 산정한
            지연배상금을 지급합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            8. 환불 및 교환 신청 방법
          </h2>
          <p>
            환불 및 교환을 원하시는 경우 다음의 방법으로 신청하실 수 있습니다.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>고객센터 전화 또는 이메일 문의</li>
            <li>마이페이지의 주문 내역에서 환불/교환 신청</li>
            <li>
              환불 및 교환 신청 시 주문번호, 상품명, 환불/교환 사유를
              명시해주시기 바랍니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            9. 제작 주문 상품의 특별 규정
          </h2>
          <p>맞춤 제작 상품의 경우, 다음과 같은 특별 규정이 적용됩니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>제작 시작 전까지는 취소 및 전액 환불이 가능합니다.</li>
            <li>
              제작이 시작된 이후에는 취소 및 환불이 불가능하며, 단, 제작 상품에
              하자가 있는 경우에는 환불 또는 재제작이 가능합니다.
            </li>
            <li>
              제작 상품의 경우, 고객님의 요청사항에 따라 제작된 상품은 단순
              변심에 의한 교환이 불가능합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            10. 기타
          </h2>
          <p>
            이 환불정책에서 정하지 않은 사항은 관련 법령 및 회사의 이용약관에
            따릅니다. 환불 및 교환에 대한 문의사항이 있으시면 고객센터로
            연락주시기 바랍니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            11. 정책의 시행일
          </h2>
          <p>
            이 환불정책은 2024년 1월 1일부터 시행되며, 정책의 변경이 있는 경우
            변경된 내용과 시행일을 명시하여 서비스의 초기화면에 그 시행일 7일
            이전부터 시행일 후 상당한 기간 동안 공지합니다.
          </p>
        </section>
      </div>
    </PopupLayout>
  );
}
