import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      // 生成类型声明的入口文件（与 Vite 多入口一致）
      entryRoot: 'src',
      // 输出目录（与 Vite 打包目录一致，默认 dist）
      outDir: 'dist',
      // 支持子模块单独生成 .d.ts（关键：适配单独引入）
      include: ['src/**/*'],
      // 排除测试文件（可选）
      exclude: ['src/**/*.test.ts']
    })
  ],
  build: {
    // 库模式打包（关键）
    lib: {
      // 入口文件（你的包核心入口，如 src/index.ts）
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        arrayTools: path.resolve(__dirname, 'src/arrayTools.ts'),
        valueFunction: path.resolve(__dirname, 'src/valueFunction.ts')
      },
      // 包名（需与 package.json 的 name 一致，支持命名空间如 @xxx/xxx）
      name: '@hcstar/com-utils',
      formats: ['es', 'cjs'],
      fileName: (format, entryName: string) => `${entryName}.${format}.js`
    },
    // 优化配置：避免打包依赖（让使用者自行安装 peerDependencies）
    rollupOptions: {
      // 外部依赖（不打包进产物，如 lodash、vue 等）
      external: [],

      output: {
        // 避免子模块之间的循环依赖（可选，Rollup 自动处理，保险起见配置）
        hoistTransitiveImports: false,
        // 全局变量映射（若 external 了全局变量，可选）,例：vue: 'Vue'
        globals: {}
      }
    }
  }
});
