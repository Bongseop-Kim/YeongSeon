export interface CourierCompany {
  code: string;
  name: string;
  trackingUrlTemplate: string;
}

export const COURIER_COMPANIES: CourierCompany[] = [
  {
    code: "cj",
    name: "CJ대한통운",
    trackingUrlTemplate:
      "https://trace.cjlogistics.com/web/detail.jsp?slipno={trackingNumber}",
  },
  {
    code: "hanjin",
    name: "한진택배",
    trackingUrlTemplate:
      "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession=&wblnumText2={trackingNumber}",
  },
  {
    code: "logen",
    name: "로젠택배",
    trackingUrlTemplate:
      "https://www.ilogen.com/web/personal/trace/{trackingNumber}",
  },
  {
    code: "epost",
    name: "우체국택배",
    trackingUrlTemplate:
      "https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1={trackingNumber}",
  },
  {
    code: "lotte",
    name: "롯데택배",
    trackingUrlTemplate:
      "https://www.lotteglogis.com/home/reservation/tracking/index?InvNo={trackingNumber}",
  },
  {
    code: "kyungdong",
    name: "경동택배",
    trackingUrlTemplate:
      "https://kdexp.com/service/delivery/tracksearch.do?barcode={trackingNumber}",
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
