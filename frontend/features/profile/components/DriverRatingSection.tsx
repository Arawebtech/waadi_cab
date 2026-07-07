// 'use client';

// import { Skeleton } from '@/components/ui/skeleton';
// import { useDriverDashboard } from '@/features/cab-booking/hooks';
// import { ProfileSectionCard } from './ProfileSectionCard';
// import { StarRating } from './StarRating';

// export function DriverRatingSection() {
//   const { data, isLoading, isError } = useDriverDashboard();

//   if (isLoading) {
//     return (
//       <ProfileSectionCard title="Driver Rating">
//         <div className="flex items-center gap-4">
//           <Skeleton className="h-10 w-16" />
//           <Skeleton className="h-5 w-28" />
//         </div>
//       </ProfileSectionCard>
//     );
//   }

//   const rating = data?.stats?.rating ?? 0;
//   const totalTrips = data?.stats?.totalTrips;

//   return (
//     <ProfileSectionCard title="Driver Rating">
//       {isError ? (
//         <p className="py-2 text-sm text-slate-500">Rating unavailable</p>
//       ) : (
//         <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
//           <p className="text-3xl font-bold text-slate-900">{rating > 0 ? rating.toFixed(1) : '—'}</p>
//           <div className="space-y-1">
//             <StarRating value={rating} />
//             {typeof totalTrips === 'number' && (
//               <p className="text-sm text-slate-500">
//                 {totalTrips.toLocaleString('en-IN')} ride{totalTrips === 1 ? '' : 's'} completed
//               </p>
//             )}
//           </div>
//         </div>
//       )}
//     </ProfileSectionCard>
//   );
// }

'use client';

import { Star } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useDriverDashboard } from '@/features/cab-booking/hooks';
import { StarRating } from './StarRating';


export function DriverRatingSection() {

  const { data, isLoading, isError } = useDriverDashboard();


  if (isLoading) {
    return (
      <Card className="mobile-card rounded-2xl border-slate-200/80 shadow-sm">

        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Star className="h-5 w-5 mr-2" />
            Driver Rating
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-5 w-28" />
          </div>
        </CardContent>

      </Card>
    );
  }


  const rating = data?.stats?.rating ?? 0;
  const totalTrips = data?.stats?.totalTrips;



  return (
    <Card className="mobile-card overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">

      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Star className="h-5 w-5 mr-2" />
          Driver Rating
        </CardTitle>
      </CardHeader>


      <CardContent className="space-y-4">


        {isError ? (

          <p className="py-2 text-sm text-gray-600">
            Rating unavailable
          </p>

        ) : (

          <>

            <div className="flex items-center justify-between">


              <div>
                <p className="text-4xl font-bold text-slate-900">
                  {rating > 0
                    ? rating.toFixed(1)
                    : '—'}
                </p>

                <StarRating value={rating} />

              </div>


              <div className="text-right">

                <p className="text-sm text-gray-600">
                  Total Trips
                </p>

                <p className="text-xl font-semibold text-slate-900">
                  {totalTrips
                    ? totalTrips.toLocaleString('en-IN')
                    : 0}
                </p>

              </div>


            </div>



            <div className="border-t divide-y divide-slate-100">


              <div className="flex justify-between py-2">

                <span className="text-sm text-gray-600">
                  Rating Status
                </span>

                <span className="text-sm font-medium text-slate-900">
                  {rating >= 4
                    ? 'Excellent'
                    : rating >= 3
                    ? 'Good'
                    : 'Need Improvement'}
                </span>

              </div>



              <div className="flex justify-between py-2">

                <span className="text-sm text-gray-600">
                  Completed Rides
                </span>

                <span className="text-sm font-medium">
                  {totalTrips?.toLocaleString('en-IN') || 0}
                </span>

              </div>



            </div>


          </>

        )}


      </CardContent>

    </Card>
  );
}