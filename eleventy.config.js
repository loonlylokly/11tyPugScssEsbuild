import pluginNavigation from "@11ty/eleventy-navigation";
import * as sass from 'sass'
import pug from 'pug'
import esbuild from 'esbuild'

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
  const isDev = !!process.argv.includes("--serve");

  if (!isDev) {
    eleventyConfig.on("beforeBuild", async () => {
      const { rm } = await import("node:fs/promises");
      try {
        await rm("_dist", { recursive: true, force: true });
        console.log("✅ _dist удален (только в prod)");
      } catch (err) {
        console.error("❌ Ошибка удаления _dist:", err);
      }
    });
  }

  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css", // optional, default: "html"

    // `compile` is called once per .scss file in the input directory
    compile: async function (inputContent, inputPath) {
      if (!inputPath.endsWith('styles.scss')) {
        return;
      }
      let result = sass.compileString(inputContent, {
        loadPaths: [
          this.config.dir.includes,
          "./src/modules", // Ваши кастомные пути
          "./src/assets/styles", // Ваши кастомные пути
        ],
        style: "expanded",
        sourceMap: false,
        // Включите это для дебага путей:
        logger: {
          warn: (message, { deprecation, span, stack }) => {
            // console.warn("[Sass]", message);
          }
        }
      });

      // This is the render function, `data` is the full data cascade
      return async (data) => {
        return result.css;
      };
    },
  });

  // Обработка .pug файлов
  eleventyConfig.addTemplateFormats("pug");
  eleventyConfig.addExtension("pug", {
    compile: async (inputContent, inputPath) => {

      if (inputPath.startsWith('./src/modules')) {
        console.log('Skipping module file:', inputPath);
        return;
      }
      // Компиляция Pug в функцию
      const template = pug.compile(inputContent, {
        filename: inputPath,
        pretty: true, // Отключает минификацию (добавляет отступы)
        basedir: ".", // Путь для include/extend
      });

      return async (data) => {
        // Рендеринг с данными из 11ty
        return template(data);
      };
    },
  });

  eleventyConfig.addTemplateFormats("js");


  const wrapInDOMContentLoaded = {
    name: 'wrap-in-dom-content-loaded',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.outputFiles) {
          // console.log(result.outputFiles[0].text, 'test');
          for (const file of result.outputFiles) {
            // if (file.path.endsWith('.js')) {
            const originalCode = new TextDecoder().decode(file.contents);
            console.log(originalCode)
            // Обернём весь код внутри IIFE в DOMContentLoaded
            const wrappedCode = originalCode.replace(
              /^\(\(\)\s*=>\s*\{([\s\S]*)\}\)\(\);/,
              `(() => {document.addEventListener('DOMContentLoaded', () => {\n$1\n});\n})();`
            );
            file.contents = new TextEncoder().encode(wrappedCode);
            // }
          }
        }
      });
    },
  };

  eleventyConfig.addExtension("js", {
    outputFileExtension: "js",
    compile: async (content, inputPath) => {
      if (!inputPath.endsWith('index.js')) {
        return;
      }

      return async () => {
        let result = await esbuild.build({
          entryPoints: [
            inputPath
          ],
          bundle: true,
          minify: false,
          write: false,
          format: 'iife', // важно, чтобы код был в IIFE
          plugins: [wrapInDOMContentLoaded],
        });

        return result.outputFiles[0].text;
      };
    }
  });

  eleventyConfig.addPlugin(pluginNavigation);

  eleventyConfig.addPassthroughCopy({ "src/assets/images": "assets/images" });
  eleventyConfig.addPassthroughCopy({ "src/assets/video": "assets/video" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts": "assets/fonts" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js/vendor": "assets/js" });

  // Run Eleventy when these files change:
  // https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets
  eleventyConfig.addWatchTarget("src/assets/font/**/*.{woff2,woff}");
  eleventyConfig.addWatchTarget("src/assets/video/**/*.{mp4,hevc}");
  eleventyConfig.addWatchTarget("src/assets/images/**/*.{svg,webp,png,jpg,jpeg,gif}");
  eleventyConfig.addWatchTarget("src/assets/styles/**/*.{scss,css}");

  eleventyConfig.addPlugin(pluginNavigation);
};

export const config = {
  // Control which files Eleventy will process
  // e.g.: *.md, *.njk, *.html, *.liquid
  templateFormats: [
    "html",
    "11ty.js",
  ],

  // Pre-process *.html files with: (default: `liquid`)
  // htmlTemplateEngine: "pug",

  // These are all optional:
  dir: {
    input: "./src",          // default: "."
    includes: "",  // default: "_includes" (`input` relative)
    data: "/src/_data",          // default: "_data" (`input` relative)
    output: "_dist"
  },
  clean: true,

  pathPrefix: "/"
};
