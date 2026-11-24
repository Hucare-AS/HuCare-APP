import { useState } from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import type { Trend, TrendPoint } from '@/lib/care';

const HEIGHT = 180;
/** 위아래 여백 (점이 테두리에 붙지 않게) */
const PAD = 16;
const ORANGE = '#EF7000';
const GRID = '#E2E6E2';
const GAP = '#F2F3F5';

type TrendChartProps = {
  trend: Trend;
  selected: TrendPoint | null;
  onSelect: (point: TrendPoint) => void;
  label: string;
};

/**
 * 추세 그래프 (Figma 975:4315). 주황 실선은 측정값, 점선은 기간 평균, 회색 칸은 측정이 없던 구간.
 * 누르면 가장 가까운 점을 고른다.
 */
export function TrendChart({ trend, selected, onSelect, label }: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const points = trend.segments.flat();
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // 값이 하나뿐이거나 모두 같아도 가운데에 그려지도록 범위를 벌린다
  const span = Math.max(high - low, 4);
  const min = (low + high) / 2 - span / 2 - span * 0.15;
  const max = (low + high) / 2 + span / 2 + span * 0.15;

  const px = (x: number) => x * width;
  const py = (value: number) => PAD + (1 - (value - min) / (max - min)) * (HEIGHT - PAD * 2);

  const pick = (event: GestureResponderEvent) => {
    if (!points.length || !width) return;
    const x = event.nativeEvent.locationX / width;
    const nearest = points.reduce((best, point) =>
      Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best,
    );
    onSelect(nearest);
  };

  return (
    <View className="gap-[10px]">
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        onPress={pick}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height: HEIGHT }}
      >
        {width ? (
          <Svg width={width} height={HEIGHT}>
            {trend.gaps.map(([from, to]) => (
              <Rect
                key={`${from}-${to}`}
                x={px(from)}
                y={0}
                width={Math.max(px(to) - px(from), 1)}
                height={HEIGHT}
                fill={GAP}
              />
            ))}
            {[PAD, HEIGHT / 2, HEIGHT - PAD].map((y) => (
              <Line key={y} x1={0} x2={width} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
            ))}
            {trend.average !== null && points.length ? (
              <Line
                x1={0}
                x2={width}
                y1={py(trend.average)}
                y2={py(trend.average)}
                stroke={ORANGE}
                strokeOpacity={0.6}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ) : null}
            {trend.segments.map((segment) =>
              segment.length > 1 ? (
                <Polyline
                  key={segment[0].x}
                  points={segment.map((point) => `${px(point.x)},${py(point.value)}`).join(' ')}
                  fill="none"
                  stroke={ORANGE}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : (
                <Circle
                  key={segment[0].x}
                  cx={px(segment[0].x)}
                  cy={py(segment[0].value)}
                  r={3}
                  fill={ORANGE}
                />
              ),
            )}
            {selected ? (
              <Circle
                cx={px(selected.x)}
                cy={py(selected.value)}
                r={5}
                fill="#FFFFFF"
                stroke={ORANGE}
                strokeWidth={2.5}
              />
            ) : null}
          </Svg>
        ) : null}
        {!points.length ? (
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-muted">이 기간에는 측정 기록이 없어요.</Text>
          </View>
        ) : null}
      </Pressable>
      <View className="h-[15px]">
        {trend.labels.map((tick) => (
          <Text
            key={tick.text}
            className="absolute text-[10px] leading-[15px] tracking-normal text-[#777777]"
            style={{ left: px(tick.x) }}
          >
            {tick.text}
          </Text>
        ))}
      </View>
    </View>
  );
}
