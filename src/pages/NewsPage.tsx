import { Newspaper } from "lucide-react";

export default function NewsPage() {
  return (
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">News</h1>
      </div>
      <div className="text-center py-20">
        <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">News feed coming soon</p>
      </div>
    </div>
  );
}
