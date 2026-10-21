import { QueryProvider } from "./common/providers/QueryProvider";
import { PointsView } from "./features/points/points-view";
import "./index.css";

export default function App() {
  return (
    <QueryProvider>
      <PointsView />
    </QueryProvider>
  );
}
