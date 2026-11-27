import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * 백엔드 초대 링크 `/invitations/{id}?token=...` 로 들어온 경우.
 * 초대 확인 화면으로 넘겨 누가 어떤 대상에 초대했는지 보여준다 (로그인 전이면 로그인부터).
 */
export default function InvitationLink() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const invite = token ? `${id}?token=${token}` : undefined;
  return <Redirect href={{ pathname: '/home/join', params: invite ? { invite } : {} }} />;
}
