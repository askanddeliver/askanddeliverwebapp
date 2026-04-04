import PublicLayout from '../components/public/PublicLayout';

export default function InvoicePaid() {
  return (
    <PublicLayout>
      {/*
        Clear the fixed public header (h-20 = 5rem). Previously py-16 left only 4rem top padding,
        so the heading sat under the bar and looked clipped; backdrop-blur on the nav also caused halos.
      */}
      <div className="max-w-lg mx-auto px-4 pt-28 pb-16 sm:pt-32 text-center min-h-[min(520px,calc(100dvh-10rem))] flex flex-col justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank you</h1>
        <p className="text-gray-600 leading-relaxed">
          Your payment was received. We will update our records accordingly.
        </p>
      </div>
    </PublicLayout>
  );
}
