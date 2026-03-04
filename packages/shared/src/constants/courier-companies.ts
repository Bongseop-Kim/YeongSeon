export interface CourierCompany {
  code: string;
  name: string;
  trackingUrlTemplate: string;
  sweetTrackerCode: string;
}

export const COURIER_COMPANIES: CourierCompany[] = [
  {
    code: "cj",
    name: "CJ대한통운",
    trackingUrlTemplate:
      "https://trace.cjlogistics.com/web/detail.jsp?slipno={trackingNumber}",
    sweetTrackerCode: "04",
  },
  {
    code: "hanjin",
    name: "한진택배",
    trackingUrlTemplate:
      "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession=&wblnumText2={trackingNumber}",
    sweetTrackerCode: "05",
  },
  {
    code: "logen",
    name: "로젠택배",
    trackingUrlTemplate:
      "https://www.ilogen.com/web/personal/trace/{trackingNumber}",
    sweetTrackerCode: "06",
  },
  {
    code: "epost",
    name: "우체국택배",
    trackingUrlTemplate:
      "https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1={trackingNumber}",
    sweetTrackerCode: "01",
  },
  {
    code: "lotte",
    name: "롯데택배",
    trackingUrlTemplate:
      "https://www.lotteglogis.com/home/reservation/tracking/index?InvNo={trackingNumber}",
    sweetTrackerCode: "08",
  },
  {
    code: "kyungdong",
    name: "경동택배",
    trackingUrlTemplate:
      "https://kdexp.com/service/delivery/tracksearch.do?barcode={trackingNumber}",
    sweetTrackerCode: "23",
  },
];

export const COURIER_COMPANY_NAMES = COURIER_COMPANIES.map((c) => c.name);

export function buildTrackingUrl(
  courierName: string,
  trackingNumber: string,
): string | null {
  const courier = COURIER_COMPANIES.find((c) => c.name === courierName);
  if (!courier) return null;
  return courier.trackingUrlTemplate.replace("{trackingNumber}", trackingNumber);
}
