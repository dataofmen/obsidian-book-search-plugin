import { replaceDateInString } from '@utils/utils';
import { App, Notice, PluginSettingTab, Setting } from 'obsidian';

import { ServiceProvider } from '@src/constants';
import languages from '@utils/languages';
import { SettingServiceProviderModal } from '@views/setting_service_provider_modal';
import BookSearchPlugin from '../main';
import { FileNameFormatSuggest } from './suggesters/FileNameFormatSuggester';
import { FileSuggest } from './suggesters/FileSuggester';
import { FolderSuggest } from './suggesters/FolderSuggester';

const docUrl = 'https://github.com/anpigon/obsidian-book-search-plugin';

export enum DefaultFrontmatterKeyType {
  snakeCase = 'Snake Case',
  camelCase = 'Camel Case',
}

export interface BookSearchPluginSettings {
  folder: string; // new file location
  fileNameFormat: string; // new file name format
  frontmatter: string; // frontmatter that is inserted into the file
  content: string; // what is automatically written to the file.
  useDefaultFrontmatter: boolean;
  defaultFrontmatterKeyType: DefaultFrontmatterKeyType;
  templateFile: string;
  serviceProvider: ServiceProvider;
  naverClientId: string;
  naverClientSecret: string;
  localePreference: string;
  apiKey: string;
  nlApiKey: string; // 국립중앙도서관 API 키
  openPageOnCompletion: boolean;
  showCoverImageInSearch: boolean;
  enableCoverImageSave: boolean;
  enableCoverImageEdgeCurl: boolean;
  coverImagePath: string;
  askForLocale: boolean;
}

export const DEFAULT_SETTINGS: BookSearchPluginSettings = {
  folder: '',
  fileNameFormat: '',
  frontmatter: '',
  content: '',
  useDefaultFrontmatter: true,
  defaultFrontmatterKeyType: DefaultFrontmatterKeyType.camelCase,
  templateFile: '',
  serviceProvider: ServiceProvider.google,
  naverClientId: '',
  naverClientSecret: '',
  localePreference: 'default',
  apiKey: '',
  nlApiKey: '', // 국립중앙도서관 API 키 기본값
  openPageOnCompletion: true,
  showCoverImageInSearch: false,
  enableCoverImageSave: false,
  enableCoverImageEdgeCurl: true,
  coverImagePath: '',
  askForLocale: true,
};

export class BookSearchSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: BookSearchPlugin,
  ) {
    super(app, plugin);
  }

  private createGeneralSettings(containerEl) {
    this.createHeader('General Settings', containerEl);
    this.createFileLocationSetting(containerEl);
    this.createFileNameFormatSetting(containerEl);
  }

  private createHeader(title, containerEl) {
    const header = document.createDocumentFragment();
    header.createEl('h2', { text: title });
    return new Setting(containerEl).setHeading().setName(header);
  }

  private createFileLocationSetting(containerEl) {
    new Setting(containerEl)
      .setName('New file location')
      .setDesc('New book notes will be placed here.')
      .addSearch(cb => {
        try {
          new FolderSuggest(this.app, cb.inputEl);
        } catch (e) {
          console.error(e); // Improved error handling
        }
        cb.setPlaceholder('Example: folder1/folder2')
          .setValue(this.plugin.settings.folder)
          .onChange(new_folder => {
            this.plugin.settings.folder = new_folder;
            this.plugin.saveSettings();
          });
      });
  }

  private createFileNameFormatSetting(containerEl) {
    const newFileNameHint = document.createDocumentFragment().createEl('code', {
      text: replaceDateInString(this.plugin.settings.fileNameFormat) || '{{title}} - {{author}}',
    });
    new Setting(containerEl)
      .setClass('book-search-plugin__settings--new_file_name')
      .setName('New file name')
      .setDesc('Enter the file name format.')
      .addSearch(cb => {
        try {
          new FileNameFormatSuggest(this.app, cb.inputEl);
        } catch (e) {
          console.error(e); // Improved error handling
        }
        cb.setPlaceholder('Example: {{title}} - {{author}}')
          .setValue(this.plugin.settings.fileNameFormat)
          .onChange(newValue => {
            this.plugin.settings.fileNameFormat = newValue?.trim();
            this.plugin.saveSettings();

            newFileNameHint.innerHTML = replaceDateInString(newValue) || '{{title}} - {{author}}';
          });
      });
    containerEl
      .createEl('div', {
        cls: ['setting-item-description', 'book-search-plugin__settings--new_file_name_hint'],
      })
      .append(newFileNameHint);
  }

  private createTemplateFileSetting(containerEl: HTMLElement) {
    const templateFileDesc = document.createDocumentFragment();
    templateFileDesc.createDiv({ text: 'Files will be available as templates.' });
    templateFileDesc.createEl('a', {
      text: 'Example Template',
      href: `${docUrl}#example-template`,
    });
    new Setting(containerEl)
      .setName('Template file')
      .setDesc(templateFileDesc)
      .addSearch(cb => {
        try {
          new FileSuggest(this.app, cb.inputEl);
        } catch {
          // eslint-disable
        }
        cb.setPlaceholder('Example: templates/template-file')
          .setValue(this.plugin.settings.templateFile)
          .onChange(newTemplateFile => {
            this.plugin.settings.templateFile = newTemplateFile;
            this.plugin.saveSettings();
          });
      });
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.classList.add('book-search-plugin__settings');

    this.createGeneralSettings(containerEl);
    this.createTemplateFileSetting(containerEl);

    // Service Provider
    let serviceProviderExtraSettingButton: HTMLElement;
    // eslint-disable-next-line prefer-const
    let preferredLocaleDropdownSetting: Setting;
    // eslint-disable-next-line prefer-const
    let coverImageEdgeCurlToggleSetting: Setting;
    const hideServiceProviderExtraSettingButton = () => {
      serviceProviderExtraSettingButton.addClass('book-search-plugin__hide');
    };
    const showServiceProviderExtraSettingButton = () => {
      serviceProviderExtraSettingButton.removeClass('book-search-plugin__hide');
    };
    const hideServiceProviderExtraSettingDropdown = () => {
      if (preferredLocaleDropdownSetting !== undefined) {
        preferredLocaleDropdownSetting.settingEl.addClass('book-search-plugin__hide');
      }
    };
    const showServiceProviderExtraSettingDropdown = () => {
      if (preferredLocaleDropdownSetting !== undefined) {
        preferredLocaleDropdownSetting.settingEl.removeClass('book-search-plugin__hide');
      }
    };
    const hideCoverImageEdgeCurlToggle = () => {
      if (coverImageEdgeCurlToggleSetting !== undefined) {
        coverImageEdgeCurlToggleSetting.settingEl.addClass('book-search-plugin__hide');
      }
    };
    const showCoverImageEdgeCurlToggle = () => {
      if (coverImageEdgeCurlToggleSetting !== undefined) {
        coverImageEdgeCurlToggleSetting.settingEl.removeClass('book-search-plugin__hide');
      }
    };

    const toggleServiceProviderExtraSettings = (
      serviceProvider: ServiceProvider = this.plugin.settings?.serviceProvider,
    ) => {
      if (serviceProvider === ServiceProvider.naver) {
        naverApiSetting.settingEl.show();
        nlApiSetting.settingEl.hide();
        hideServiceProviderExtraSettingDropdown();
        hideCoverImageEdgeCurlToggle();
      } else if (serviceProvider === ServiceProvider.google) {
        naverApiSetting.settingEl.hide();
        nlApiSetting.settingEl.hide();
        showServiceProviderExtraSettingDropdown();
        showCoverImageEdgeCurlToggle();
      } else if (serviceProvider === ServiceProvider.nl) {
        naverApiSetting.settingEl.hide();
        nlApiSetting.settingEl.show();
        hideServiceProviderExtraSettingDropdown();
        hideCoverImageEdgeCurlToggle();
      }
    };

    new Setting(containerEl)
      .setName('Service Provider')
      .setDesc('Choose a service provider for book search.')
      .addDropdown(dropdown => {
        dropdown
          .addOption(ServiceProvider.google, 'Google Books')
          .addOption(ServiceProvider.naver, 'Naver Books')
          .addOption(ServiceProvider.nl, '국립중앙도서관')
          .setValue(this.plugin.settings.serviceProvider)
          .onChange(async value => {
            this.plugin.settings.serviceProvider = value as ServiceProvider;
            await this.plugin.saveSettings();
            toggleServiceProviderExtraSettings(value as ServiceProvider);
          });
      });

    // Naver API Settings
    const naverApiSettingDesc = document.createDocumentFragment();
    naverApiSettingDesc.append(
      '네이버 개발자센터에서 애플리케이션을 등록하고 클라이언트 ID와 시크릿을 발급받으세요. ',
      naverApiSettingDesc.createEl('a', {
        text: '자세히 보기',
        href: 'https://developers.naver.com/docs/common/openapiguide/appregister.md#애플리케이션-등록',
      }),
    );

    const naverApiSetting = new Setting(containerEl)
      .setName('Naver API Settings')
      .setDesc(naverApiSettingDesc)
      .addText(text =>
        text
          .setPlaceholder('Client ID')
          .setValue(this.plugin.settings.naverClientId)
          .onChange(async value => {
            this.plugin.settings.naverClientId = value;
            await this.plugin.saveSettings();
          }),
      )
      .addText(text =>
        text
          .setPlaceholder('Client Secret')
          .setValue(this.plugin.settings.naverClientSecret)
          .onChange(async value => {
            this.plugin.settings.naverClientSecret = value;
            await this.plugin.saveSettings();
          }),
      );

    // 국립중앙도서관 API Settings
    const nlApiSettingDesc = document.createDocumentFragment();
    nlApiSettingDesc.append(
      '국립중앙도서관 Open API 키를 입력하세요. ',
      nlApiSettingDesc.createEl('a', {
        text: '자세히 보기',
        href: 'https://www.nl.go.kr/NL/contents/N31101030500.do',
      }),
    );

    const nlApiSetting = new Setting(containerEl)
      .setName('국립중앙도서관 API Settings')
      .setDesc(nlApiSettingDesc)
      .addText(text =>
        text
          .setPlaceholder('API Key')
          .setValue(this.plugin.settings.nlApiKey)
          .onChange(async value => {
            this.plugin.settings.nlApiKey = value;
            await this.plugin.saveSettings();
          }),
      );

    preferredLocaleDropdownSetting = new Setting(containerEl)
      .setName('Preferred locale')
      .setDesc('Sets the preferred locale to use when searching for books.')
      .addDropdown(dropDown => {
        const defaultLocale = window.moment.locale();
        dropDown.addOption(defaultLocale, `${languages[defaultLocale] || defaultLocale} (Default Locale)`);
        window.moment.locales().forEach(locale => {
          const localeName = languages[locale];
          if (localeName && locale !== defaultLocale) dropDown.addOption(locale, localeName);
        });
        const localeValue = this.plugin.settings.localePreference;
        dropDown
          .setValue(localeValue === DEFAULT_SETTINGS.localePreference ? defaultLocale : localeValue)
          .onChange(async value => {
            const newValue = value;
            this.plugin.settings.localePreference = newValue;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Open New Book Note')
      .setDesc('Enable or disable the automatic opening of the note on creation.')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.openPageOnCompletion).onChange(async value => {
          this.plugin.settings.openPageOnCompletion = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Show Cover Images in Search')
      .setDesc('Toggle to show or hide cover images in the search results.')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.showCoverImageInSearch).onChange(async value => {
          this.plugin.settings.showCoverImageInSearch = value;
          await this.plugin.saveSettings();
        }),
      );

    // A toggle whether or not to ask for the locale every time a search is made
    new Setting(containerEl)
      .setName('Ask for Locale')
      .setDesc('Toggle to enable or disable asking for the locale every time a search is made.')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.askForLocale).onChange(async value => {
          this.plugin.settings.askForLocale = value;
          await this.plugin.saveSettings();
        }),
      );

    coverImageEdgeCurlToggleSetting = new Setting(containerEl)
      .setName('Enable Cover Image Edge Curl Effect')
      .setDesc('Toggle to show or hide page curl effect in cover images.')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.enableCoverImageEdgeCurl).onChange(async value => {
          this.plugin.settings.enableCoverImageEdgeCurl = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Enable Cover Image Save')
      .setDesc('Toggle to enable or disable saving cover images in notes.')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.enableCoverImageSave).onChange(async value => {
          this.plugin.settings.enableCoverImageSave = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Cover Image Path')
      .setDesc('Specify the path where cover images should be saved.')
      .addSearch(cb => {
        try {
          new FolderSuggest(this.app, cb.inputEl);
        } catch {
          // eslint-disable
        }
        cb.setPlaceholder('Enter the path (e.g., Images/Covers)')
          .setValue(this.plugin.settings.coverImagePath)
          .onChange(async value => {
            this.plugin.settings.coverImagePath = value.trim();
            await this.plugin.saveSettings();
          });
      });

    // Google API Settings
    this.createHeader('Google API Settings', containerEl);
    new Setting(containerEl)
      .setName('Description About Google API Settings')
      .setDesc(
        '**WARNING** please use this field after you must understand Google Cloud API, such as API key security.',
      );

    new Setting(containerEl)
      .setName('Status Check')
      .setDesc('check whether API key is saved. It does not guarantee that the API key is valid or invalid.')
      .addButton(button => {
        button.setButtonText('API Check').onClick(async () => {
          if (this.plugin.settings.apiKey.length) {
            new Notice('API key exist.');
          } else {
            new Notice('API key does not exist.');
          }
        });
      });

    const googleAPISetDesc = document.createDocumentFragment();
    googleAPISetDesc.createDiv({ text: 'Set your Books API key.' });
    googleAPISetDesc.createDiv({
      text: 'For security reason, saved API key is not shown in this textarea after saved.',
    });
    let tempKeyValue = '';
    new Setting(containerEl)
      .setName('Set API Key')
      .setDesc(googleAPISetDesc)
      .addText(text => {
        text.inputEl.type = 'password';
        text.setValue('').onChange(async value => {
          tempKeyValue = value;
        });
      })
      .addButton(button => {
        button.setButtonText('Save Key').onClick(async () => {
          this.plugin.settings.apiKey = tempKeyValue;
          await this.plugin.saveSettings();
          new Notice('API key Saved');
        });
      });

    // 초기 상태 설정
    toggleServiceProviderExtraSettings(this.plugin.settings.serviceProvider);
  }
}
