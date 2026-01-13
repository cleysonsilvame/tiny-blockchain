import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';
import { getDefaultAttributes, getDefaultCallees, getDefaultTags, getDefaultVariables } from 'eslint-plugin-better-tailwindcss/defaults';
import { MatcherType } from "eslint-plugin-better-tailwindcss/types";

export default defineConfig([
  {
    files: ['src/**/*.ts'],
    plugins: {
      "better-tailwindcss": eslintPluginBetterTailwindcss
    },
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    plugins: {
      "better-tailwindcss": eslintPluginBetterTailwindcss
    },
    rules: {
      "better-tailwindcss/enforce-consistent-class-order": ["warn", {
        attributes: [
          ...getDefaultTags(),
          [
            "myTag", [
              {
                match: MatcherType.String
              }
            ]
          ]
        ]
      }],
      "better-tailwindcss/enforce-consistent-line-wrapping": ["warn", {
        callees: [
          ...getDefaultCallees(),
          [
            "myFunction", [
              {
                match: MatcherType.String
              }
            ]
          ]
        ]
      }],
      "better-tailwindcss/no-duplicate-classes": ["warn", {
        attributes: [
          ...getDefaultAttributes(),
          [
            "myAttribute", [
              {
                match: MatcherType.String
              }
            ]
          ]
        ]
      }],
      "better-tailwindcss/no-unnecessary-whitespace": ["warn", {
        variables: [
          ...getDefaultVariables(),
          [
            "myVariable", [
              {
                match: MatcherType.String
              }
            ]
          ]
        ]
      }]
    },
  },
]);
