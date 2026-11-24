import { expect, test } from '@playwright/test';

test('스플래시 뒤 홈 대상 목록으로 이동한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('HuCare')).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('돌봄 대상 3명')).toBeVisible();
  await expect(page.getByText('미확인 알림 2건 보기', { exact: false })).toBeVisible();
  await expect(page.getByText('연결 끊김 · 마지막 상태 확인')).toBeVisible();
});

test('대상 카드를 누르면 그 대상의 대시보드로 간다', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: /^지우,/ }).click();
  await expect(page).toHaveURL(/\/home\/board$/);
  await expect(page.getByText(/지우는 오늘도 평소와 같으세요/)).toBeVisible();

  // 기록 탭도 고른 대상 기준이다
  await page.getByRole('tab', { name: '기록' }).click();
  await expect(page.getByText('알림 0건', { exact: false })).toBeVisible();
});

test('대상 수정에서 다른 대상을 고르고 전체 대상 홈으로 돌아간다', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: '대상 수정' }).click();
  await expect(page.getByText('현재 대상: 어머니')).toBeVisible();
  await expect(page.getByText('반려동물 · 레이더형 · 연결 끊김')).toBeVisible();

  await page.getByRole('button', { name: '전체 대상 홈' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('돌봄 대상 3명')).toBeVisible();
});

test('새 대상을 등록하면 그 대상의 대시보드가 열린다', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: '대상 추가' }).click();
  await expect(page.getByText('1 / 7 · 대상 등록')).toBeVisible();
  await expect(page.getByRole('tab', { name: '홈' })).toBeHidden();

  await page.getByRole('tab', { name: '어린이' }).click();
  await page.getByRole('textbox', { name: '이름' }).fill('하늘');
  await page.getByRole('button', { name: '대상 정보' }).click();
  await page.getByRole('button', { name: '3~6세' }).click();
  await page.getByRole('button', { name: '기기 연결하기' }).click();

  await expect(page).toHaveURL(/\/home\/board$/);
  await expect(page.getByText('아직 확인된 건강 기록이 없어요.')).toBeVisible();
});

test('초대 코드로 참여하면 대상이 늘어난다', async ({ page }) => {
  await page.goto('/home/join');
  await page.getByRole('textbox', { name: '6자리 초대 코드' }).fill('12');
  await page.getByRole('button', { name: '초대 확인' }).click();
  await expect(page.getByText('6자리 숫자 코드를 입력해 주세요.')).toBeVisible();

  await page.getByRole('textbox', { name: '6자리 초대 코드' }).fill('482917');
  await page.getByRole('button', { name: '초대 확인' }).click();
  await expect(page.getByText('김민수님이 할머니 돌봄에 초대했어요')).toBeVisible();

  await page.getByRole('button', { name: '참여하기' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('돌봄 대상 4명')).toBeVisible();
});

test('받은 초대를 거절할 수 있다', async ({ page }) => {
  await page.goto('/home/join');
  await page.getByRole('textbox', { name: '6자리 초대 코드' }).fill('482917');
  await page.getByRole('button', { name: '초대 확인' }).click();
  await page.getByRole('button', { name: '거절하기' }).click();
  await expect(page.getByText('초대를 거절했어요.')).toBeVisible();
});

test('설정에서 설치 장소를 저장하고 연락처를 지운다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /기기 설치 장소/ }).click();
  await page.getByRole('button', { name: '설치 장소 수정' }).click();
  await page.getByRole('textbox', { name: '기기 설치 장소' }).fill('안방');
  await page.getByRole('button', { name: '설치 장소 저장' }).click();
  await expect(page.getByRole('button', { name: '설치 장소 수정' })).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByText('안방')).toBeVisible();

  await page.getByRole('button', { name: /돌봄센터 연락처/ }).click();
  await page.getByRole('button', { name: '연락처 수정' }).click();
  await page.getByRole('textbox', { name: '돌봄센터 연락처' }).fill('');
  await page.getByRole('button', { name: '연락처 저장' }).click();
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByText('011-0000-0000')).toBeHidden();
});

test('함께 보는 가족에게 초대 코드를 만들고 가족을 내보낸다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /함께 보는 가족/ }).click();
  await page.getByRole('button', { name: '추가하기' }).click();
  await expect(page.getByText('482917')).toBeVisible();

  await page.getByRole('button', { name: '동생', exact: true }).click();
  await page.getByRole('button', { name: '내보내기' }).click();
  await expect(page.getByRole('button', { name: '동생', exact: true })).toBeHidden();
});

test('추세 그래프에서 기간과 지표를 바꾼다', async ({ page }) => {
  await page.goto('/records');
  await page.getByRole('button', { name: '추세 그래프 보기' }).click();
  await expect(page).toHaveURL(/\/records\/trend$/);
  await expect(page.getByText('평균 71 bpm')).toBeVisible();
  await expect(page.getByText('선택 구간 · 11:30')).toBeVisible();

  await page.getByRole('tab', { name: '주간' }).click();
  await expect(page.getByText('하루 평균을 이었어요', { exact: false })).toBeVisible();

  await page.getByRole('tab', { name: '호흡수' }).click();
  await expect(page.getByText('호흡수 · 회/분')).toBeVisible();

  await expect(page.getByText(/^개인 기준선 \d+ 회\/분/)).toBeVisible();

  await page.getByRole('tab', { name: '연간' }).click();
  await expect(page.getByText('올해 · 2026년', { exact: false })).toBeVisible();
  await expect(page.getByText('하루 평균을 이었어요', { exact: false })).toBeVisible();
});

test('카메라형 대상은 사진을 날짜별로 본다', async ({ page }) => {
  await page.goto('/home/board');
  await page.getByRole('button', { name: '사진 보기' }).click();
  await expect(page).toHaveURL(/\/home\/photos$/);
  await expect(page.getByText('어머니 · 카메라형')).toBeVisible();
  await expect(page.getByRole('button', { name: '거실 사진 14:30' })).toBeVisible();

  await page.getByRole('tab', { name: '이벤트 영상' }).click();
  await expect(page.getByRole('button', { name: '넘어지셨을 수 있어요 19:30' })).toBeVisible();

  await page.getByRole('button', { name: '이전 날' }).click();
  await expect(page.getByText('2026.10.25')).toBeVisible();
});

test('홈에서 알림을 확인하면 평소 상태로 바뀌고 알림 목록에 기록된다', async ({ page }) => {
  await page.goto('/home/board');
  await expect(page.getByText(/어머니는 확인이 필요해요/)).toBeVisible();

  await page.getByRole('button', { name: '확인했어요' }).click();
  await expect(page.getByText(/어머니는 오늘도 평소와 같으세요/)).toBeVisible();

  await page.getByRole('tab', { name: '알림' }).click();
  await expect(page.getByText('확인 필요')).toBeHidden();
  await expect(page.getByText('김영희님이 오후 10:30에 확인했어요.')).toBeVisible();
});

test('자세한 값을 펼치고 접는다', async ({ page }) => {
  await page.goto('/home/board');
  await page.getByRole('button', { name: '자세한 값 더보기' }).click();
  await expect(page.getByText('긴장도')).toBeVisible();

  await page.getByRole('button', { name: '접기' }).click();
  await expect(page.getByText('긴장도')).toBeHidden();
});

test('알림 상세 팝업에서 확인할 수 있다', async ({ page }) => {
  await page.goto('/alerts');
  await page.getByRole('button', { name: '넘어지셨을 수 있어요' }).click();
  await expect(page.getByText('어머니에게 전화 걸기')).toBeVisible();
  await expect(page.getByText('그 때 심박수는 48이었어요', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: '확인했어요' }).click();
  await expect(page.getByText('어머니에게 전화 걸기')).toBeHidden();
  await expect(page.getByText('확인 필요')).toBeHidden();
});

test('달력에서 날짜를 눌러 그날 기록을 보고 돌아온다', async ({ page }) => {
  await page.goto('/records');
  await expect(page.getByText('오늘 1번 확인했어요')).toBeVisible();
  await expect(page.getByText('알림 2건 · 심박수 67~77')).toBeVisible();

  await page.getByRole('button', { name: '이번 달 기록' }).click();
  await expect(page.getByText('이번 달 26일 중 23일은 평소와 같으셨어요')).toBeVisible();
  await expect(page.getByText('알림 3건 · 확인 못 한 날 1일')).toBeVisible();

  await page.getByRole('button', { name: '10월 14일' }).click();
  await expect(page).toHaveURL(/\/records\/day\?date=2026-10-14$/);
  await expect(page.getByText('2026년 10월 14일')).toBeVisible();
  await expect(page.getByText('6번 확인 · 심박수 평균 73 · 산소 96%')).toBeVisible();
  await expect(page.getByRole('tab', { name: '홈' })).toBeHidden();

  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL(/\/records\/month$/);
});

test('날짜 주소로 바로 들어와도 뒤로가기는 이번 달 기록으로 간다', async ({ page }) => {
  await page.goto('/records/day?date=2026-10-14');
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL(/\/records\/month$/);
});

test('홈 바로가기와 종 아이콘이 각 화면으로 이동한다', async ({ page }) => {
  await page.goto('/home/board');
  await page.getByRole('button', { name: '한달 기록' }).click();
  await expect(page).toHaveURL(/\/records\/month$/);

  await page.getByRole('button', { name: '알림' }).click();
  await expect(page).toHaveURL(/\/alerts$/);

  await page.getByRole('tab', { name: '홈' }).click();
  await page.getByRole('button', { name: '설정' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('달력은 실제 요일에 맞고 이번 달 뒤로는 갈 수 없다', async ({ page }) => {
  await page.goto('/records/month');
  await expect(page.getByRole('button', { name: '다음 달' })).toBeDisabled();

  await page.getByRole('button', { name: '이전 달' }).click();
  await expect(page.getByText('2026년 9월')).toBeVisible();
  await expect(page.getByText('9월 기록이 없어요')).toBeVisible();
});

test('설정 값을 바꾸면 새로고침해도 유지된다', async ({ page }) => {
  await page.goto('/settings');
  const deviceOff = page.getByRole('switch', { name: '기기 꺼짐' });
  await expect(deviceOff).toHaveAttribute('aria-checked', 'false');
  await deviceOff.click();

  await page.getByRole('combobox', { name: '야간 알림' }).click();
  await page.getByRole('button', { name: '아침에 모아 받기' }).click();

  await page.reload();
  await expect(page.getByRole('switch', { name: '기기 꺼짐' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByRole('combobox', { name: '야간 알림' })).toHaveText('아침에 모아 받기');
});
