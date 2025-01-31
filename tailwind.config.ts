import daisyui from "daisyui";
import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.tsx"],
  // theme: {
  //   extend: {
  //     fontSize: {
  //       sm: "1rem", // 16px
  //       base: "1.125rem", // 18px
  //       lg: "1.25rem", // 20px
  //       xl: "1.5rem", // 24px
  //       "2xl": "1.75rem", // 28px
  //       "3xl": "2rem", // 32px
  //     },
  //   },
  // },
  plugins: [daisyui],
  daisyui: {
    themes: ["night"],
  },
} satisfies Config;
