import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { NEW_ARRIVALS_DATA } from "../constants/NEW_ARRIVALS_DATA";

export const NewArrivals = () => {
  return (
    <div className="w-full px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">New Arrivals</h2>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {NEW_ARRIVALS_DATA.map((item) => (
            <CarouselItem
              key={item.id}
              className="pl-2 md:pl-4 basis-1/2 md:basis-1/4"
            >
              <div className="group cursor-pointer">
                <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100 mb-3">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="text-sm font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-600">
                  {item.price.toLocaleString()}원
                </p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};
