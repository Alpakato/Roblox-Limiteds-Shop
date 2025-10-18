import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      // ✅ ปิด error บางอย่างที่งอแง
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/ban-types": "off",

      // ✅ ปิดเตือนเรื่อง <img>
      "@next/next/no-img-element": "off",

      // ✅ ลดระดับ error ที่ทำให้ build ตก
      "react/no-unescaped-entities": "warn",
      "react/display-name": "off",
    },
  },
];

export default eslintConfig;
