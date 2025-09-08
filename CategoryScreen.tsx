// React and React Native Imports
import React, {Component} from 'react';
import {
  AppState,
  Dimensions,
  FlatList,
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {connect} from 'react-redux';
import messaging from '@react-native-firebase/messaging';
import moment from 'moment/moment';
import getSymbolFromCurrency from 'currency-symbol-map';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import remoteConfig from '@react-native-firebase/remote-config';
import TurboImage from 'react-native-turbo-image';

// Redux Actions
import {getCategories} from '../../actions/Categories';
import {getCollections} from '../../actions/Collections';
import {getLayouts} from '../../actions/Layouts';
import {getPages} from '../../actions/Pages';
import {getProductByHandle} from '../../actions/Product';
import {getStoreDataByBundleId} from '../../actions/getStoreData';
import {getColorCode} from '../../actions/getColorCode';
import {
  addLocalWishList,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from '../../actions/Users/Wishlist';
import {
  doSendFCMToken,
  getCustomerAccountVersion,
} from '../../actions/Users/User';

// Components
import CollectionListItem from '../../components/CollectionListItem';
import ImageSlider from '../../components/BannerImageSlider';
import Loader from '../../components/Loader';
import ViewEmpty from '../../components/ViewEmpty';
import {AppUpdateDialogue} from '../../components/AppUpdateDialog';
import {Marquee} from '../../components/Marquee';

// Utils and Helpers
import {
  checkNetwork,
  doLogEvent,
  getBaseDecodeId,
  isLightColor,
  isShowAnalytics,
  isShowWishListPlanWise,
  normalize,
} from '../../utils/Common';
import {
  configNotification,
  displayNotification,
  getFilteredLayoutData,
  isColorCode,
} from '../../utils/Validator';
import {getFontFamily} from '../../utils/CategoryUtil';
import {showSimpleDialogMessage, showToast} from '../../utils/Alert';
import {iosPlatform, isIpad} from '../../utils/Platform';
import {
  deepLinkingNavigate,
  getProductHandle,
} from '../../utils/DeepLinkHandler';
import {
  getAppName,
  getRemoteConfigPrefix,
  isProductImagesSqure,
} from '../../shopify/StoreDataUtil';

// Constants and Types
import {DetailParent} from '../../constants/AppEnum';
import {
  DEFAULT_CURRENCY,
  FONT_SIZE,
  TABLET_WIDTH,
} from '../../constants/Constants';
import {IStoreData, PropsCategory} from '../../@types';
import {ILayoutData, ILayoutInfo, ISubLayoutData} from '../../reducers/Layouts';
import {IProfile} from '../../reducers/User';
import {ISetIcons, IThemeItem} from '../../reducers/Theme';
import {IProductInfo} from '../../reducers/Wishlist';
import {IRemoteData, IRootState} from '../../@types/state_typex';

// Styles and Assets
import {colors} from '../../styles';
import styles from '../../styles/theme/category/CategoryStyle';
import EmptyProduct from '../../assets/images/svg/emptyProduct.svg';

// Redux Store Actions
import {setNavigationRef, setProxy, setTheme} from '../../store/actions/theme';
import {storeRemoteConfigData} from '../../store/actions/RemoteConfigData';

// i18n
import {translate} from '../../localisation/index';
/**
 * Represents a wishlist order item
 */
interface WishListOrder {
  created_at: string;
  customer_id: string;
  id: number;
  product_id: string;
  shop_id: string;
  updated_at: string;
}

/**
 * Parameters for FCM token
 */
interface FCMTokenParams {
  shop_id: string;
  user_id: string | null;
  token: string;
  type: number;
  ud_id: string;
}

/**
 * Component props interface
 */
interface Props extends PropsCategory {
  // Redux action creators
  setProxy: (isProxy: boolean) => void;
  getStoreDataByBundleId: (deviceID: string) => Promise<any>;
  getCollections: (productID: string, isUpdateList: boolean) => Promise<any>;
  getCategories: () => Promise<any>;
  getLayouts: () => Promise<any>;
  getPages: (count: number) => Promise<any>;
  getColorCode: () => Promise<any>;
  doSendFCMToken: (params: FCMTokenParams) => Promise<any>;
  getWishlist: (custId: string) => Promise<any>;
  removeFromWishlist: (custID: string, product_ID: string) => Promise<any>;
  addToWishlist: (custID: string, product_ID: string) => Promise<any>;
  addLocalWishList: (filterArray: WishListOrder[]) => Promise<any>;
  getProductByHandle: (handle: string) => Promise<any>;
  getCustomerAccountVersion: () => void;
  storeRemoteConfigData: (storeData: IRemoteData) => Promise<any>;
  setNavigationRef: (refs: any) => Promise<any>;
  
  // Redux state props
  layouts: ILayoutInfo[];
  collections: IProductInfo[];
  accessToken: string;
  profile?: IProfile;
  storeData: IStoreData;
  wishlist: WishListOrder[];
  setIcons: ISetIcons;
  theme: IThemeItem[];
}

/**
 * Component state interface
 */
interface State {
  allCategory: ILayoutInfo[];
  collectionSliderBg: string;
  collectionGridBg: string;
  borderRadius: number;
  refreshing: boolean;
  buttonColor: string;
  products: IProductInfo[];
  isWishlistAPICalling: boolean;
  default_uri: string;
  isLoading: boolean;
  isConnectionExpensive: boolean;
  isConnected: boolean;
  isInternetReachable: boolean;
  remoteConfigData: any;
  isAppUpdate: boolean;
  appUpdateEveryTime: boolean;
  visibleIndex: number;
  isLoadError: boolean;
  currentRemoveIndex: number;
  currentRootIndex: number;
  isEmpty: boolean;
}

/**
 * Main Category Screen Component
 * Displays a list of product categories and collections
 */
class CategoryScreen extends Component<Props, State> {
  private imageSliderRef: Map<number, any>;

  constructor(props: Props) {
    super(props);

    // Disable font scaling for Text components
    if (!(Text as any).defaultProps) {
      (Text as any).defaultProps = {};
    }
    (Text as any).defaultProps.allowFontScaling = false;

    this.state = {
      allCategory: [],
      collectionSliderBg: '#484a70',
      collectionGridBg: '#5c4227',
      borderRadius: 10,
      refreshing: false,
      buttonColor: 'rgba(255,255,255,0.8)',
      products: [],
      isWishlistAPICalling: false,
      default_uri: 'https://mshop.atharvasystem.com/images/default.jpg',
      isLoading: true,
      isConnectionExpensive: false,
      isConnected: true,
      isInternetReachable: true,
      remoteConfigData: undefined,
      isAppUpdate: false,
      appUpdateEveryTime: true,
      visibleIndex: 0,
      isLoadError: false,
      currentRemoveIndex: -1,
      currentRootIndex: -1,
      isEmpty: false,
    };

    this.imageSliderRef = new Map();
  }

  /**
   * Lifecycle method called after component mounts
   */
  async componentDidMount() {
    // Set up navigation focus listener
    const focusUnsubscribe = this.props.navigation.addListener('focus', () => {
      this.props.setNavigationRef(this.props.navigation);
    });

    // Check for proxy
    const { McheckProxy } = NativeModules;
    if (McheckProxy && McheckProxy.detectProxySync()) {
      this.props.setProxy(true);
    } else {
      NetInfo.addEventListener(state => {
        const {details, isConnected, isInternetReachable} = state;
        this.setState(
          {
            isConnectionExpensive: details?.isConnectionExpensive ?? false,
            isConnected: isConnected ?? false,
            isInternetReachable: isInternetReachable ?? false,
          },
          () => {
            if (isConnected) {
              if (this.state.products.length <= 0) {
                this.props
                  .getStoreDataByBundleId(DeviceInfo.getBundleId())
                  .then(async () => {
                    Promise.all([
                      this.props.getCategories(),
                      this.props.getLayouts(),
                      this.props.getPages(
                        this.state.remoteConfigData[
                          `${getRemoteConfigPrefix()}_570`
                        ]._value,
                      ),
                      this.props.getColorCode(),
                      this.props.getCustomerAccountVersion(),
                      this.requestUserPermission(),
                      this.callAPIGetWishList(),
                    ]);
                  })
                  .catch(e => {
                    checkNetwork(); //show network pop up
                    this.setState({isLoading: false});
                  });
              }
            } else {
              checkNetwork(); //show network pop up
              this.setState({isLoading: false, isEmpty: true});
            }
          },
        );
      });
      this.notificationFB();
      this.props.navigation.addListener('blur', () => {
        setTimeout(() => {
          this.setState({isLoading: false});
        }, 1000);
      });
    }
    AppState.addEventListener('change', state => {
      if (state === 'active') {
        const {McheckProxy} = NativeModules;
        if (McheckProxy.detectProxySync()) {
          this.props.setProxy(true);
        }
      }
    });
    this.appUpdate();
    Linking.addEventListener('url', this.handleDeepLink);
  }
  handleDeepLink = (event: {url: string}) => {
    this.handleURL(event.url);
  };
  handleURL = async (responseLink: string) => {
    const handleOfProdct = getProductHandle(responseLink);
    if (handleOfProdct.length > 0) {
      this.setState({isLoading: handleOfProdct.length > 0});
      const response = await this.props.getProductByHandle(handleOfProdct);

      if (response) {
        const {data} = response;
        if (data) {
          const {productByHandle} = data;
          if (productByHandle) {
            const {id, title} = productByHandle;
            const params = {
              id: id,
              $og_title: title,
            };
            this.setState({isLoading: false});
            deepLinkingNavigate(this.props.navigation, params);
          }
        }
      }
    }
  };
  componentWillUnmount(): void {
    Linking.removeAllListeners('url');
  }
  async componentDidUpdate(prevProps: Props) {
    if (prevProps.layouts !== this.props.layouts) {
      this.setState(
        {
          allCategory: getFilteredLayoutData(this.props.layouts),
          isEmpty:
            getFilteredLayoutData(this.props.layouts).length <= 0
              ? true
              : false,
        },
        () => {
          let productIds: string[] = [];
          this.state.allCategory
            .filter(value => value.layoutSlug === 'BannersSliderLayout')
            .forEach(category => {
              let checkIsNotNull = category?.layoutData?.name
                ? category?.layoutData?.name.split(' ').join('_')
                : category?.layoutData?.name;

              this.imageSliderRef.get(checkIsNotNull)?._move(0, true);
            });

          this.state.allCategory
            .filter(value => value.layoutSlug === 'ProductSliderLayout')
            .forEach(category => {
              category?.subLayoutData?.forEach(subData => {
                productIds.push(`gid://shopify/Product/${subData.productId}`);
              });
            });

          this.props.getCollections(JSON.stringify(productIds), true);

          this.setState({refreshing: false, isLoading: false});
        },
      );
    }

    if (prevProps.collections !== this.props.collections) {
      const filtreProduct: IProductInfo[] = this.props.collections.filter(
        data => data !== null,
      );

      this.setState({
        products: filtreProduct.map(value => {
          value.isSelected = false;
          value.metaFieldId = undefined;
          return value;
        }),
      });
    }

    if (this.props.wishlist !== prevProps.wishlist) {
      let result = await checkNetwork();
      if (!result) {
        return;
      }
    
    }
  }

  async appUpdate() {
    try {
      const androidApiLevel = await DeviceInfo.getApiLevel();

      //ask permission when api level is 33 or above
      if (Platform.OS == 'android' && 33 <= androidApiLevel) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }

      await remoteConfig().fetch(__DEV__ ? 0 : 3600);
      await remoteConfig().fetchAndActivate();
      let data = await remoteConfig().getAll();

      this.props.storeRemoteConfigData(data);
      this.setState({remoteConfigData: data});

      const currentValue: number = Number(
        data[`${getRemoteConfigPrefix()}_568`]._value,
      );

      const platformVersion: string = iosPlatform()
        ? DeviceInfo.getVersion()
        : DeviceInfo.getBuildNumber();

      if (currentValue > parseFloat(platformVersion)) {
        if (!this.state.isAppUpdate && this.state.appUpdateEveryTime) {
          this.setState({isAppUpdate: true});

          if (data[`${getRemoteConfigPrefix()}_569`]._value === 'false') {
            this.setState({appUpdateEveryTime: false});
          }
        }
      }
    } catch (e) {
      console.log('remote config error>>>>.', e);
    }
  }

  async requestUserPermission() {
    const authStatus = await messaging().requestPermission();

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      const result = await messaging().getToken();
      // Get the device's unique identifier
      const deviceId = await DeviceInfo.getUniqueId();
      /**
       * Sends the FCM token to the server
       */
      private async sendFCMToken() {
        try {
          const fcmToken = await messaging().getToken();
          const fcmParams: FCMTokenParams = {
            shop_id: this.props.storeData?.shop?.id || '',
            user_id: this.props.profile?.id?.toString() || null,
            token: fcmToken,
            type: 1, // 1 for mobile
            ud_id: await DeviceInfo.getUniqueId(),
          };
          await this.props.doSendFCMToken(fcmParams);
        } catch (error) {
          console.error('Error sending FCM token:', error);
        }
      }
      const params: Params = {
        shop_id: this.props.storeData.id ?? '',
        user_id:
          this.props.accessToken && this.props.profile
            ? this.props.profile.id.toString()
            : null,
        token: result ?? '',
        type: Platform.select({ android: 1, ios: 2 }) ?? 1,
        ud_id: deviceId,
      };

      this.props.doSendFCMToken(params);
    }

// ...

    if (title_array.length > 0) {
      return (
        <View
          style={{
            justifyContent: 'center',
            paddingVertical: 10,
            backgroundColor: layoutData.panelBackgroundColor,
          }}
        >
          <Marquee speed={1}>
            <Text
              style={{
                color: layoutData.textFontColor,
                fontSize: isIpad() ? textFontSize * FONT_SIZE : textFontSize,
                fontFamily: getFontFamily(
                  layoutData.textFontStyle,
                  layoutData.textFontWeight,
                ),
              }}
            >
              {spacedNames}
            </Text>
          </Marquee>
        </View>
      );
    } else {
      return null;
    }

// ...

    /**
     * Handles item press in the category list
     * @param item - The pressed item
     * @param slug - Slug of the pressed item
     * @param productItem - Product item
     */
    async onPressCategoryItem(item: any, slug: string, productItem?: any) {
      let result = await checkNetwork();
      if (!result) {
        return;
      }
      if (item.catalog_type === 'collection') {
        if (isShowAnalytics(this.props.storeData?.activated_plan_id))
          doLogEvent('view_item_list', {
            item_list_id: item.catalog_id,
            item_list_name: item.name,
            item_brand: getAppName(),
          });
      } else if (item.catalog_type === 'product') {
        const priceRange = productItem?.priceRange;
        const variants = productItem?.variants?.edges;
        const amount =
          variants && variants.length > 0
            ? Number(variants[0].node?.price.amount).toFixed(2)
            : '0';
        let currencyCode: string =
          priceRange?.minVariantPrice?.currencyCode ?? DEFAULT_CURRENCY;
        let items: any[] = [];
        items.push({
          item_id: productItem.id,
          item_name: productItem.title,
          item_brand: getAppName(),
          item_quantity: 1,
          item_revenue: parseFloat(amount.replace(/[^\d.]/g, '')),
          quantity: 1,
          revenue: parseFloat(amount.replace(/[^\d.]/g, '')),
          price: parseFloat(amount.replace(/[^\d.]/g, '')),
          item_price: parseFloat(amount.replace(/[^\d.]/g, '')),
        });

        doLogEvent('view_item', {
          currency: currencyCode,
          value: parseFloat(amount.replace(/[^\d.]/g, '')) * 1,
          items: items,
        });
      }
      //analytics using firebase

      switch (slug) {
        case 'ProductSliderLayout':
          if (productItem) {
            this.props.navigation.navigate('ProductDetails', {
              params: {
                item: productItem,
                DetailParent: DetailParent.Product,
                themeColor: this.props.theme,
                setIcons: this.props.setIcons,
                storeData: this.props.storeData,
              },
            });
            doLogEvent(`${slug}_${item.handle?.replace(/[-\s]+/g, '_')}`, {
              handle: item.handle,
              title: item.title,
            });
          } else {
            showToast(
              'Something went wrong for this product, Please try again later.',
            );
          }
          return;

        default:
          if (item) {
            this.props.navigation.navigate('Products', {
              params: {
                item: item,
                allCategory: this.state.allCategory,
                themeColor: this.props.theme,
                setIcons: this.props.setIcons,
                storeData: this.props.storeData,
              },
            });

            doLogEvent(`${slug}_${item.catalog_handle}`, {
              catalog_handle: item.catalog_handle,
              name: item.name,
            });
          }

          return;
      }
          <View>
            {item.subLayoutData.length > 0 &&
              this.collectionSectionLayoutView(item, layoutSlug)}
          </View>
        );
      case 'CollectionSliderLayout':
        return (
          <View>
            {item.subLayoutData.length > 0 &&
              this.collectionSliderLayoutView(item, layoutSlug)}
          </View>
        );
      case 'CollectionGridLayout':
        return (
          <View>
            {item.subLayoutData.length > 0 &&
              this.collectionGridLayoutView(item, layoutSlug)}
          </View>
        );

      case 'SmallStandaloneBanner':
      case 'LargeStandaloneBanner':
        return <View>{this.standaloneBannerLayoutView(item, layoutSlug)}</View>;
      case 'ProductSliderLayout':
        return (
          <View>
            {item.subLayoutData.length > 0 &&
              this.productSliderLayoutView(item, layoutSlug, index)}
          </View>
        );
      case 'AnnouncementBar':
        return <>{this.announcementBarLayoutView(item, layoutSlug)}</>;
      default:
        return null;
    }
  };
  handleRefresh = async () => {
    let result = await checkNetwork();
    if (!result) {
      this.setState({isLoading: false, refreshing: false});
      return;
    }
    this.setState({refreshing: true}, () => {
      this.props.getStoreDataByBundleId(DeviceInfo.getBundleId()).then(() => {
        this.props.getCategories();
        this.props.getLayouts();
        this.props.getPages(
          this.state.remoteConfigData[`${getRemoteConfigPrefix()}_570`]._value,
        );
        this.props.getColorCode();
        this.props.getCustomerAccountVersion();
        this.callAPIGetWishList();
      });
    });
  };
  render() {
    let {allCategory, isWishlistAPICalling} = this.state;

    return (
      <>
        <StatusBar
          translucent
          barStyle={
            isLightColor(
              isColorCode(
                this.props.layouts,
                'headerPanelBackgroundColor',
                'BLACK',
                false,
              ),
            )
              ? 'dark-content'
              : 'light-content'
          }
          backgroundColor={isColorCode(
            this.props.layouts,
            'headerPanelBackgroundColor',
            'BLACK',
            false,
          )}
        />
        <View style={[styles.container, styles.column]}>
          {this.state.isAppUpdate && (
            <AppUpdateDialogue
              onClose={() => {
                this.setState({isAppUpdate: false});
              }}
              visibility={this.state.isAppUpdate}
              data={this.state.remoteConfigData}
            />
          )}

          {allCategory.length > 0 && (
            <FlatList
              style={{flex: 1}}
              data={allCategory}
              renderItem={({item, index}) => this.renderAllViews(item, index)}
              refreshing={this.state.refreshing}
              onRefresh={() => this.handleRefresh()}
              contentContainerStyle={{
                paddingBottom: normalize(isIpad() ? 70 : 80),
              }}
            />
          )}

          {allCategory.length <= 0 &&
            !this.state.isLoading &&
            this.state.isEmpty && (
              <ViewEmpty
                title={translate('product_not_available')}
                desc={translate('please_check_later')}
                SVGImg={EmptyProduct}
              />
            )}

          <Loader isLoading={this.state.isLoading} />
        </View>
      </>
    );
  }
}
const mapStateToProps = (state: IRootState) => ({
  profile: state.user.profile,
  layouts: state.layouts.layouts,
  collections: state.collections.collections,
  wishlist: state.wish.wishlist,
  storeData: state.storeData.storeData,
  setAccountMethod: state.storeData.setAccountMethod,
  accessToken: state.user.accessToken,
  theme: state.theme.theme,
  setIcons: state.theme.setIcons,
});
const mapDispatchToProps = (dispatch: any) => ({
  getCategories: () => dispatch(getCategories()),

  getStoreDataByBundleId: (BUNDLE_ID: string) =>
    dispatch(getStoreDataByBundleId(BUNDLE_ID)),
  getLayouts: () => dispatch(getLayouts()),
  getPages: (count: number) => dispatch(getPages(count)),
  getCollections: (productIds: string, isUpdateList: boolean) =>
    dispatch(getCollections(productIds, isUpdateList)),
  addToWishlist: (customerId: string, productId: string) =>
    dispatch(addToWishlist(customerId, productId)),
  addLocalWishList: (params: any) => dispatch(addLocalWishList(params)),
  removeFromWishlist: (customerId: string, productId: string) =>
    dispatch(removeFromWishlist(customerId, productId)),
  doSendFCMToken: (params: any) => dispatch(doSendFCMToken(params)),
  getWishlist: (id: string) => dispatch(getWishlist(id)),
  setTheme: (colors: any) => dispatch(setTheme(colors)),
  getColorCode: () => dispatch(getColorCode()),
  setProxy: (isProxy: boolean) => dispatch(setProxy(isProxy)),
  getProductByHandle: (handle: string) => dispatch(getProductByHandle(handle)),
  getCustomerAccountVersion: () => dispatch(getCustomerAccountVersion()),
  storeRemoteConfigData: (remoteData: any) =>
    dispatch(storeRemoteConfigData(remoteData)),
  setNavigationRef: (refs: any) => dispatch(setNavigationRef(refs)),
});
export default connect(mapStateToProps, mapDispatchToProps)(CategoryScreen);
