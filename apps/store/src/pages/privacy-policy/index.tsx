import {
  PolicyPageLayout,
  PolicySection,
  PolicyList,
  PolicyInfoBox,
} from "@/shared/composite/policy-components";
import { PageSeo } from "@/shared/ui/page-seo";

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageSeo
        title="개인정보처리방침"
        description="ESSE SION이 수집하는 개인정보 항목, 보유 기간, 제3자 제공 기준과 정보주체 권리 행사 방법을 안내합니다."
        ogUrl="https://essesion.shop/privacy-policy"
      />
      <PolicyPageLayout title="개인정보처리방침">
        <PolicySection title="1. 개인정보의 처리 목적">
          <p>
            영선산업(서비스명: ESSE SION, 이하 "회사")은 다음의 목적을 위하여
            개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의
            용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보
            보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할
            예정입니다.
          </p>
          <PolicyList>
            <li>
              홈페이지 회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스
              제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용
              방지, 각종 고지·통지 목적
            </li>
            <li>
              재화 또는 서비스 제공: 물품배송, 서비스 제공, 계약서·청구서 발송,
              콘텐츠 제공, 맞춤서비스 제공, 본인인증, 요금결제·정산
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="2. 개인정보의 처리 및 보유기간">
          <p>
            회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
            개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서
            개인정보를 처리·보유합니다.
          </p>
          <PolicyList>
            <li>
              회원 가입 및 관리: 회원 탈퇴 시까지 (다만, 관계 법령 위반에 따른
              수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)
            </li>
            <li>
              재화 또는 서비스 제공: 재화·서비스 공급완료 및 요금결제·정산 완료
              시까지
            </li>
            <li>전자상거래에서의 계약·청약철회 등에 관한 기록: 5년</li>
            <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="3. 처리하는 개인정보의 항목">
          <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
          <PolicyList>
            <li>
              필수항목: 이름, 이메일, 전화번호, 배송지 주소, 소셜 계정 식별자
              (Google, Kakao 등 소셜 로그인을 통해 수집)
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="4. 개인정보의 제3자 제공">
          <p>
            회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한
            범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등
            개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를
            제3자에게 제공합니다.
          </p>
        </PolicySection>

        <PolicySection title="5. 개인정보처리의 위탁">
          <p>
            회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보
            처리업무를 위탁하고 있습니다.
          </p>
          <PolicyList>
            <li>
              배송 서비스: 배송 업체에 배송에 필요한 최소한의 정보(이름,
              전화번호, 주소) 제공
            </li>
            <li>
              결제 서비스: 결제 대행 업체(토스페이먼츠)에 결제에 필요한 정보
              제공
            </li>
            <li>
              소셜 로그인 서비스: Google, Kakao 등 소셜 플랫폼에 인증에 필요한
              정보 제공
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="6. 정보주체의 권리·의무 및 그 행사방법">
          <p>
            정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련
            권리를 행사할 수 있습니다.
          </p>
          <PolicyList>
            <li>개인정보 열람요구권</li>
            <li>개인정보 정정·삭제요구권</li>
            <li>개인정보 처리정지 요구권</li>
            <li>개인정보 손해배상청구권</li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="7. 개인정보의 파기">
          <p>
            회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가
            불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
          </p>
          <p className="mt-2">파기의 절차 및 방법은 다음과 같습니다.</p>
          <PolicyList>
            <li>
              파기절차: 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져
              내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시
              파기됩니다.
            </li>
            <li>
              파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적
              방법을 사용합니다.
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="8. 개인정보 보호책임자">
          <p>
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
            처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와
            같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <PolicyInfoBox>
            <p className="font-medium text-foreground">개인정보 보호책임자</p>
            <p className="mt-1">이름: 김영선</p>
            <p>직책: 대표</p>
            <p>연락처: 042-626-9055</p>
          </PolicyInfoBox>
        </PolicySection>

        <PolicySection title="9. 개인정보 처리방침 변경">
          <p>
            이 개인정보처리방침은 2026년 3월 18일부터 적용되며, 법령 및 방침에
            따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행
            7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>
        </PolicySection>
      </PolicyPageLayout>
    </>
  );
}
