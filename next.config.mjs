/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
    }, // This sets the stale time for dynamic pages to 30 seconds 
  },
  serverExternalPackages: ["@node-rs/argon2"], // This allows the use of the @node-rs/argon2 package on the server side 
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: `/a/${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}/*`,
      },
    ],
  }, // This allows images from the UploadThing service to be used in the app
  rewrites: () => {
    return [
      {
        source: "/hashtag/:tag",
        destination: "/search?q=%23:tag",
      },
    ];
  }, // This is used to rewrite URLs for hashtags to the search page 
};

export default nextConfig;