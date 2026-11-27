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
  await expect(page.getByText('지금 놀이방에 계세요')).toBeVisible();

  // 기록 탭도 고른 대상 기준이다
  await page.getByRole('tab', { name: '기록' }).click();
  await expect(page.getByText('알림 0건', { exact: false })).toBeVisible();
});

test('대상 수정에서 다른 대상을 고르고 전체 대상 홈으로 돌아간다', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: '지우 대상 수정' }).click();
  await expect(page.getByText('현재 대상: 지우')).toBeVisible();
  await expect(page.getByText('반려동물 · 레이더형 · 연결 끊김')).toBeVisible();

  await page.getByRole('button', { name: '전체 대상 홈' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('돌봄 대상 3명')).toBeVisible();
});

test('새 대상을 등록하고 기기를 연결하면 첫 측정이 보인다', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: '대상 추가' }).click();
  await expect(page.getByText('1 / 7 · 대상 등록')).toBeVisible();
  await expect(page.getByRole('tab', { name: '홈' })).toBeHidden();

  await page.getByRole('tab', { name: '어린이' }).click();
  await page.getByRole('textbox', { name: '이름' }).fill('하늘');
  await page.getByRole('button', { name: '대상 정보' }).click();
  await page.getByRole('button', { name: '3~6세' }).click();
  await page.getByRole('button', { name: '기기 연결하기' }).click();

  await expect(page.getByText('2 / 7 · Bluetooth 연결')).toBeVisible();
  await page.getByRole('button', { name: '이 기기 연결' }).click();
  await expect(page.getByText('3 / 7 · 네트워크 설정')).toBeVisible();
  await page.getByRole('textbox', { name: '비밀번호' }).fill('test-wifi');
  await page.getByRole('button', { name: '연결하기' }).click();

  await expect(page.getByText('5 / 7 · 모델별 설치 가이드')).toBeVisible();
  await page.getByRole('button', { name: '설치 확인 완료' }).click();
  await page.getByRole('button', { name: '동의하고 첫 측정' }).click();

  await expect(page.getByText('첫 측정을 확인했어요')).toBeVisible();
  await expect(page.getByText('하늘의 기기가 연결됐어요')).toBeVisible();
  await expect(page.getByText('기준선 생성 중').first()).toBeVisible();
  await page.getByRole('button', { name: '대시보드로 이동' }).click();
  await expect(page).toHaveURL(/\/home\/board$/);
});

test('기기 번호가 틀리거나 Wi-Fi 연결에 실패하면 복구 화면이 나온다', async ({ page }) => {
  await page.goto('/home/register');
  await page.getByRole('textbox', { name: '이름' }).fill('하늘');
  await page.getByRole('button', { name: '기기 연결하기' }).click();

  await page.getByRole('button', { name: 'QR 코드로 연결' }).click();
  await page.getByRole('button', { name: '기기 번호 직접 입력' }).click();
  await page.getByRole('textbox', { name: '기기 번호' }).fill('HC-0000');
  await page.getByRole('button', { name: '연결하기' }).click();
  await expect(page.getByText('기기를 찾지 못했어요')).toBeVisible();

  await page.getByRole('button', { name: '다시 찾기' }).click();
  await page.getByRole('button', { name: '이 기기 연결' }).click();
  await page.getByRole('textbox', { name: '비밀번호' }).fill('wrong');
  await page.getByRole('button', { name: '연결하기' }).click();
  await expect(page.getByText('Wi-Fi 연결에 실패했어요')).toBeVisible();
});

test('초대 코드로 참여하면 대상이 늘어난다', async ({ page }) => {
  await page.goto('/home/join');
  await page.getByRole('textbox', { name: '6자리 초대 코드' }).fill('12');
  await page.getByRole('button', { name: '초대 확인' }).click();
  await expect(page.getByText('6자리 숫자 코드를 입력해 주세요.')).toBeVisible();

  await page.getByRole('textbox', { name: '6자리 초대 코드' }).fill('482917');
  await page.getByRole('button', { name: '초대 확인' }).click();
  await expect(page.getByText('초대를 수락할까요?')).toBeVisible();
  await expect(page.getByText('할머니 · 안방 · 레이더형')).toBeVisible();
  await expect(page.getByText('김민수 · 주 보호자')).toBeVisible();

  await page.getByRole('button', { name: '초대 수락' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('돌봄 대상 4명')).toBeVisible();
});

test('받은 초대를 거절할 수 있다', async ({ page }) => {
  await page.goto('/home/join');
  await page.getByRole('textbox', { name: '6자리 초대 코드' }).fill('482917');
  await page.getByRole('button', { name: '초대 확인' }).click();
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page.getByText('초대를 거절했어요.')).toBeVisible();
});

test('만료된 코드면 새 코드를 입력하는 화면이 나온다', async ({ page }) => {
  await page.goto('/home/join');
  await page.getByRole('textbox', { name: '6자리 초대 코드' }).fill('000000');
  await page.getByRole('button', { name: '초대 확인' }).click();
  await expect(page.getByText('코드가 만료됐어요')).toBeVisible();
  await expect(page.getByText('새 코드가 필요해요')).toBeVisible();

  await page.getByRole('textbox', { name: '초대 코드' }).fill('482917');
  await page.getByRole('button', { name: '다시 확인' }).click();
  await expect(page.getByText('초대를 수락할까요?')).toBeVisible();
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

test('가족 추가를 누르면 보호자 초대 코드가 나온다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /함께 보는 가족/ }).click();
  await page.getByRole('button', { name: '추가하기' }).click();
  await expect(page).toHaveURL(/\/settings\/invite$/);
  await expect(page.getByText('482 917')).toBeVisible();
  await expect(page.getByText(/^남은 시간 (10:00|09:5\d)$/)).toBeVisible();
  await expect(page.getByText('코드는 발급 후 10분 동안 유효해요.')).toBeVisible();
});

test('함께 보는 가족을 내보낸다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /함께 보는 가족/ }).click();
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
  await expect(page.getByText('지금 거실에서 건강을 확인하고 있어요')).toBeVisible();

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

test('대시보드에서 기록과 알림으로 이동한다', async ({ page }) => {
  await page.goto('/home/board');
  await expect(page.getByText('기준선 대비', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('오늘 이벤트 2건')).toBeVisible();

  await page.getByRole('tab', { name: '주간' }).click();
  await expect(page.getByText('건강 확인 횟수')).toBeVisible();

  await page.getByRole('button', { name: '기록 자세히 보기' }).click();
  await expect(page).toHaveURL(/\/records$/);

  await page.getByRole('button', { name: '알림' }).click();
  await expect(page).toHaveURL(/\/alerts$/);
});

test('달력은 실제 요일에 맞고 이번 달 뒤로는 갈 수 없다', async ({ page }) => {
  await page.goto('/records/month');
  await expect(page.getByRole('button', { name: '다음 달' })).toBeDisabled();

  await page.getByRole('button', { name: '이전 달' }).click();
  await expect(page.getByText('2026년 9월')).toBeVisible();
  await expect(page.getByText('9월 기록이 없어요')).toBeVisible();
});

test('알림 설정에서 일일 요약과 방해금지를 바꾸면 유지된다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '알림 설정' }).click();
  await page.getByRole('button', { name: '일일 요약' }).click();
  await expect(page.getByText('수신 꺼짐')).toBeVisible();
  await page.getByRole('button', { name: '요약 받기' }).click();
  await expect(page.getByText('수신 중')).toBeVisible();

  await page.reload();
  await expect(page.getByText('수신 중')).toBeVisible();

  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL(/\/settings\/notifications$/);
  await page.getByRole('button', { name: '방해금지 시간' }).click();
  await page.getByRole('button', { name: '밤 10시 ~ 오전 7시' }).click();
  await expect(page.getByText('방해금지를 설정했어요')).toBeVisible();
  await expect(page.getByText('오후 10:00 ~ 오전 7:00').filter({ visible: true })).toBeVisible();
});

test('기기 관리에서 기기를 재시작하고 Wi-Fi를 바꾼다', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '기기 관리' }).click();
  await page.getByRole('button', { name: '거실 기기' }).click();
  await expect(page.getByText('연결됨 · 어머니')).toBeVisible();

  await page.getByRole('button', { name: '기기 재시작' }).click();
  await expect(page.getByText('기기를 재시작할까요?')).toBeVisible();
  await page.getByRole('button', { name: '재시작하기' }).click();
  await expect(page.getByText('재시작을 요청했어요')).toBeVisible();
  await page.getByRole('button', { name: '기기 상태로' }).click();

  await page.getByRole('button', { name: 'Wi-Fi 변경' }).click();
  await page.getByRole('button', { name: '새 네트워크 선택' }).first().click();
  await page.getByLabel('Wi-Fi 비밀번호').fill('test-password');
  await page.getByRole('button', { name: '연결하기' }).click();
  await expect(page.getByText('Wi-Fi를 변경했어요')).toBeVisible();
});

test('사진 동의를 철회하면 동의 이력에 남는다', async ({ page }) => {
  await page.goto('/settings/privacy');
  await page.getByRole('button', { name: '사진 동의 철회' }).click();
  await page.getByRole('button', { name: '동의 철회하기' }).click();
  await expect(page.getByText('사진 동의를 철회했어요')).toBeVisible();

  await page.getByRole('button', { name: '설정으로' }).click();
  await page.getByRole('button', { name: '개인정보와 동의' }).click();
  await page.getByRole('button', { name: '동의 이력' }).click();
  await expect(page.getByText(/^선택 동의 · 철회함/)).toBeVisible();
});

test('문의를 접수하면 CS 모드를 켤 수 있다', async ({ page }) => {
  await page.goto('/settings/cs');
  await expect(page.getByRole('button', { name: 'CS 모드 켜기' })).toBeDisabled();

  await page.goto('/settings/contact');
  await page.getByLabel('문의 내용').fill('기기 연결이 자주 끊겨요.');
  await page.getByRole('button', { name: '문의 보내기' }).click();
  await expect(page.getByText('문의를 접수했어요')).toBeVisible();

  await page.getByRole('button', { name: 'CS 모드' }).click();
  await page.getByRole('button', { name: 'CS 모드 켜기' }).click();
  await expect(page.getByText('켜짐')).toBeVisible();
});

test('공지와 자주 묻는 질문을 본다', async ({ page }) => {
  await page.goto('/settings/support');
  await page.getByRole('button', { name: '공지사항' }).click();
  await page.getByRole('button', { name: 'HuCare 이용 안내' }).click();
  await expect(page.getByText('설정의 기기 관리에서 확인할 수 있어요.')).toBeVisible();

  await page.goto('/settings/faq');
  await page.getByRole('button', { name: '밤에도 긴급 알림이 오나요?' }).click();
  await expect(page.getByText('낙상과 장시간 무움직임은 밤에도 알려드려요.')).toBeVisible();
});
