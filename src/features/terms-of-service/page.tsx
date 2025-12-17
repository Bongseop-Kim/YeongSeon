import { PopupLayout } from "@/components/layout/popup-layout";
import { useNavigate } from "react-router-dom";

export default function TermsOfServicePage() {
  const navigate = useNavigate();
  return (
    <PopupLayout
      title="이용약관"
      onClose={() => (window.opener ? window.close() : navigate(-1))}
      contentClassName="px-4"
    >
      <div className="space-y-6 text-sm text-muted-foreground whitespace-pre-line">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            1. 목적
          </h2>
          <p>
            이 약관은 ESSE SION(이하 "회사")이 운영하는 온라인 쇼핑몰에서
            제공하는 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의
            권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            2. 용어의 정의
          </h2>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>
              "서비스"란 회사가 제공하는 온라인 쇼핑몰 및 관련 제반 서비스를
              의미합니다.
            </li>
            <li>
              "이용자"란 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및
              비회원을 말합니다.
            </li>
            <li>
              "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의
              정보를 지속적으로 제공받으며, 회사가 제공하는 서비스를 계속적으로
              이용할 수 있는 자를 말합니다.
            </li>
            <li>
              "비회원"이란 회원에 가입하지 않고 회사가 제공하는 서비스를
              이용하는 자를 말합니다.
            </li>
            <li>
              "아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 정하고
              회사가 승인하는 문자와 숫자의 조합을 의미합니다.
            </li>
            <li>
              "비밀번호"란 회원이 부여받은 아이디와 일치된 회원임을 확인하고
              회원의 권익 보호를 위하여 회원이 정한 문자와 숫자의 조합을
              의미합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            3. 약관의 효력 및 변경
          </h2>
          <p>
            이 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을
            발생합니다. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이
            약관을 변경할 수 있으며, 약관을 변경할 경우에는 적용일자 및
            변경사유를 명시하여 현행약관과 함께 서비스의 초기화면에 그 적용일자
            7일 이전부터 적용일자 전일까지 공지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            4. 서비스의 제공 및 변경
          </h2>
          <p>회사는 다음과 같은 서비스를 제공합니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>상품 및 서비스에 대한 정보 제공 및 구매 계약의 체결</li>
            <li>구매 계약이 체결된 상품 또는 서비스의 배송</li>
            <li>
              기타 회사가 추가 개발하거나 제휴계약 등을 통해 회원에게 제공하는
              일체의 서비스
            </li>
          </ul>
          <p className="mt-2">
            회사는 필요한 경우 서비스의 내용을 추가 또는 변경할 수 있습니다.
            다만, 서비스의 내용의 추가 또는 변경으로 인하여 회원에게 불리한
            영향을 미칠 경우에는 그 시행일의 7일 이전부터 시행일 후 상당한 기간
            동안 공지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            5. 회원가입
          </h2>
          <p>
            이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에
            동의한다는 의사표시를 함으로서 회원가입을 신청합니다. 회사는 다음 각
            호에 해당하는 경우 회원가입을 거부할 수 있습니다.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>
              가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는
              경우
            </li>
            <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
            <li>
              허위의 정보를 기재하거나, 회사가 제시하는 내용을 기재하지 않은
              경우
            </li>
            <li>
              이용자의 귀책사유로 인하여 승인이 불가능하거나 기타 규정한 제반
              사항을 위반하며 신청하는 경우
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            6. 회원정보의 변경
          </h2>
          <p>
            회원은 개인정보관리화면을 통하여 언제든지 본인의 개인정보를 열람하고
            수정할 수 있습니다. 다만, 서비스 관리를 위해 필요한 실명, 아이디
            등은 수정이 불가능합니다. 회원은 회원가입신청 시 기재한 사항이
            변경되었을 경우 온라인으로 수정을 하거나 전자우편 기타 방법으로
            회사에 대하여 그 변경사항을 알려야 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            7. 개인정보보호
          </h2>
          <p>
            회사는 이용자의 개인정보 수집 시 서비스제공을 위하여 필요한 범위에서
            최소한의 개인정보를 수집합니다. 회사는 회원가입 시 구매계약이행에
            필요한 정보를 미리 수집하지 않습니다. 다만, 관련 법령상 의무이행을
            위하여 구매계약 이전에 본인확인이 필요한 경우로서 최소한의 특정
            개인정보를 수집하는 경우에는 그러하지 아니합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            8. 회원의 의무
          </h2>
          <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
            <li>신청 또는 변경 시 허위내용의 등록</li>
            <li>타인의 정보 도용</li>
            <li>회사가 게시한 정보의 변경</li>
            <li>
              회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는
              게시
            </li>
            <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
            <li>
              회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
            </li>
            <li>
              외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는
              정보를 서비스에 공개 또는 게시하는 행위
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            9. 서비스 이용
          </h2>
          <p>
            회사는 회원에게 상품을 주문할 수 있는 온라인 쇼핑몰 서비스를
            제공합니다. 회원은 주문 시 상품의 상세 내용과 거래의 조건을 정확히
            확인한 후 구매하여야 합니다. 회사는 회원이 구매 신청한 재화 또는
            용역이 품절 등의 사유로 인도 또는 제공을 할 수 없을 때에는 지체 없이
            그 사유를 회원에게 통지하고 사전에 재화 등의 대금을 받은 경우에는
            대금을 받은 날부터 3영업일 이내에 환급하거나 환급에 필요한 조치를
            취합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            10. 계약 해지 및 이용 제한
          </h2>
          <p>
            회원은 언제든지 회사에게 회원 탈퇴를 요청할 수 있으며, 회사는 즉시
            회원탈퇴를 처리합니다. 회사는 회원이 이 약관의 의무를 위반하거나
            서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지
            등으로 서비스 이용을 단계적으로 제한할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            11. 손해배상
          </h2>
          <p>
            회사는 무료로 제공되는 서비스와 관련하여 회원에게 어떠한 손해가
            발생하더라도 동 손해가 회사의 중대한 과실에 의한 경우를 제외하고
            이에 대하여 책임을 부담하지 아니합니다. 회사는 천재지변 또는 이에
            준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스
            제공에 관한 책임이 면제됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            12. 분쟁의 해결
          </h2>
          <p>
            회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의
            이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는
            지방법원의 전속관할로 합니다. 다만, 제소 당시 이용자의 주소 또는
            거소가 분명하지 않거나 외국 거주자의 경우에는 민사소송법상의
            관할법원에 제기합니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            13. 약관의 해석
          </h2>
          <p>
            이 약관에서 정하지 아니한 사항과 이 약관의 해석에 관하여는
            전자상거래법, 전자상거래 소비자보호에 관한 법률, 약관의 규제 등에
            관한 법률, 공정거래위원회가 정하는 전자상거래 등에서의 소비자
            보호지침 및 관계법령 또는 상관례에 따릅니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            14. 약관의 시행일
          </h2>
          <p>
            이 약관은 2024년 1월 1일부터 시행되며, 약관의 변경이 있는 경우
            변경된 약관의 내용과 시행일을 명시하여 현행약관과 함께 서비스의
            초기화면에 그 시행일 7일 이전부터 시행일 후 상당한 기간 동안
            공지합니다.
          </p>
        </section>
      </div>
    </PopupLayout>
  );
}
