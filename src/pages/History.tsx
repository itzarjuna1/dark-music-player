import { Clock } from 'lucide-react';

const History = () => {
  return (
    <div className="flex-1 overflow-y-auto pb-32">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Recently Played</h1>
        </div>

        <div className="text-center py-16">
          <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No listening history</h3>
          <p className="text-muted-foreground">
            History tracking is available when authentication is enabled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default History;
