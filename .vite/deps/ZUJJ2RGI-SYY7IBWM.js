import {
  ContentView,
  ParentPanel,
  PiPProvider,
  QueryDevtoolsContext,
  THEME_PREFERENCE,
  ThemeContext,
  createLocalStorage
} from "./chunk-7ECNVS7Q.js";
import {
  createComponent,
  createMemo,
  getPreferredColorScheme
} from "./chunk-4XEUAV2G.js";
import "./chunk-5WRI5ZAA.js";

// node_modules/@tanstack/query-devtools/build/DevtoolsPanelComponent/ZUJJ2RGI.js
var DevtoolsPanelComponent = (props) => {
  const [localStore, setLocalStore] = createLocalStorage({
    prefix: "TanstackQueryDevtools"
  });
  const colorScheme = getPreferredColorScheme();
  const theme = createMemo(() => {
    const preference = props.theme || localStore.theme_preference || THEME_PREFERENCE;
    if (preference !== "system") return preference;
    return colorScheme();
  });
  return createComponent(QueryDevtoolsContext.Provider, {
    value: props,
    get children() {
      return createComponent(PiPProvider, {
        disabled: true,
        localStore,
        setLocalStore,
        get children() {
          return createComponent(ThemeContext.Provider, {
            value: theme,
            get children() {
              return createComponent(ParentPanel, {
                get children() {
                  return createComponent(ContentView, {
                    localStore,
                    setLocalStore,
                    get onClose() {
                      return props.onClose;
                    },
                    showPanelViewOnly: true
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};
var DevtoolsPanelComponent_default = DevtoolsPanelComponent;
export {
  DevtoolsPanelComponent_default as default
};
<<<<<<<< HEAD:.vite/deps/RXFVSJH2-FWAO7ZFG.js
//# sourceMappingURL=RXFVSJH2-FWAO7ZFG.js.map
========
//# sourceMappingURL=ZUJJ2RGI-SYY7IBWM.js.map
>>>>>>>> 9598fc5 (message):.vite/deps/ZUJJ2RGI-SYY7IBWM.js
