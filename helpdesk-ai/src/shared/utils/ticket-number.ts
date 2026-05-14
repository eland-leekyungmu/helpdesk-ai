/**
 * 티켓 번호 생성: TK-YYYY-NNNN 형식
 * 실제 운영에서는 DB 시퀀스 기반으로 교체 권장
 */
export function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `TK-${year}-${seq}`;
}
