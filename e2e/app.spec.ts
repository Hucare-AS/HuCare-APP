import { expect, test } from '@playwright/test';

test('스플래시 뒤 홈으로 이동한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('HuCare')).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('오늘 건강')).toBeVisible();
});

test('홈에서 알림을 확인하면 평소 상태로 바뀌고 알림 목록에 기록된다', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByText(/어머니는 확인이 필요해요/)).toBeVisible();

  await page.getByRole('button', { name: '확인했어요' }).click();
  await expect(page.getByText(/어머니는 오늘도 평소와 같으세요/)).toBeVisible();

  await page.getByRole('tab', { name: '알림' }).click();
  await expect(page.getByText('확인 필요')).toBeHidden();
  await expect(page.getByText('김영희님이 오후 10:30에 확인했어요.')).toBeVisible();
});

test('자세한 값을 펼치고 접는다', async ({ page }) => {
  await page.goto('/home');
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
  await page.goto('/home');
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
