# Feature: ERD Canvas

## 핵심 변환

### ErdData → 캔버스 요소
- `ErdTable` → 노드 (위치: `x, y`, 데이터: 테이블 전체)
- `ErdRelationship` → 엣지 (source/target: 테이블 ID)

### 자동 레이아웃 알고리즘
```
1. 관계 기반 인접 리스트 구성
2. BFS로 각 테이블의 레벨 계산
   - 시작점: 다른 테이블로부터 참조되지 않는 테이블
3. 레벨별 행으로 배치
   - 같은 레벨: 가로 배치 (간격: 테이블 너비 + 80px)
   - 다른 레벨: 세로 배치 (간격: 테이블 높이 + 60px)
```

## 테이블 노드 표시

```
┌─────────────────────────────┐
│ table_name          [schema]│  ← 테이블 색상 배경
├─────────────────────────────┤
│ 🔑 id         INT  NOT NULL │  ← PK 배지
│ 🔗 user_id    INT           │  ← FK 배지
│    name       VARCHAR(100)  │
└─────────────────────────────┘
```

- 헤더 텍스트 색상: 배경색 명도에 따라 자동으로 흰색/검은색
- 선택 상태: 강조 테두리 (primary 색상)
- 양쪽에 connection handle

## 관계 엣지 표시

- Bezier 곡선
- 기본 색상: 회색, 선택 시: primary 색상
- 소스 쪽 레이블: cardinality (1 또는 M)
- 타겟 쪽 레이블: cardinality (1 또는 N 또는 M)
- 중앙 레이블: constraintName (있을 경우)

## 상태 동기화

노드 드래그 종료:
```
onNodeDragStop(node) → updateTablePosition(node.id, node.x, node.y)
```

핸들 연결:
```
onConnect(source, target) → addRelationship(새 관계)
```

노드 클릭:
```
onClick(tableId) → selectTable(tableId)
```

엣지 클릭:
```
onClick(relId) → selectRelationship(relId)
```

## 에지 케이스

| 상황 | 처리 |
|------|------|
| 테이블 없음 | "첫 테이블을 추가해보세요" 오버레이 |
| 자기 참조 FK | 허용, 루프 곡선 엣지 |
| 테이블 50개 초과 | 미니맵 자동 표시 |
| 관계 타겟 테이블 없음 | 엣지 렌더링 건너뜀 (오류 없이) |
