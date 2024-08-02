<template>
  <!-- 管家接车数模块 -->
  <!-- 有搜索的服务中心展示服务中心 否则展示全量的服务中心 -->
  <Common headerTitle="管家接车数">
    <template slot="content">
      <TimeSelector
        v-model="selectedTimeRange"
        dateKey="housekeeper"
      ></TimeSelector>
      <el-tabs v-model="activeTabDealerCode" class="h-section__tab">
        <el-tab-pane
          v-for="(dealer, index) in dealerTabList"
          :key="index + Math.random()"
          :name="dealer.dealerCode"
          :label="dealer.dealerName"
        >
        </el-tab-pane>
      </el-tabs>
      <div v-loading="loading" class="section-common h-section__echarts">
        <BlockData
          v-if="boardData && boardData.total"
          :data="boardData"
          :searchParams="searchParams"
        >
        </BlockData>
        <no-data v-else></no-data>
      </div>
    </template>
  </Common>
</template>

<script setup lang="ts">
import { transformersClient } from "~/client";
import {
  ref,
  withDefaults,
  defineExpose,
  defineEmits,
  defineProps,
  computed,
  watch,
} from "vue";
import NoData from "~/components/no.data.vue";
import Common from "../components/common.vue";
import TimeSelector from "../components/timeSelector.vue";
import BlockData from "./boardData.vue";
import { useStore } from "~/common/vue.api";
import { handleSearchQuery } from "../help/index";
import {
  IDealerData,
  IDealerInfo,
  IDealerSearchQuery,
  IHousekeeperVehicleNumberData,
} from "~/typings/api";
import { cloneDeep, debounce, isEqual, uniqWith } from "lodash-es";
import {
  getBatchDealerBasicInfoByApi,
  isDealerEqual,
} from "~/common/help/dealer-api-logic";
import { DefaultDealerPageInfo } from "~/common/utils/constant";

type PropsType = {
  value: any[];
  searchParams: any; //筛选项
  isAllRegions?: boolean; // 是否all权限
  activeTab?: string;
};
const props = withDefaults(defineProps<PropsType>(), {
  value: () => [],
  activeTab: "", // 默认全部
  isAllRegions: false,
  searchParams: () => {},
});

const emit = defineEmits<{
  (e: "input", v: string[]): void;
  (e: "update", v?: boolean): void;
}>();

const selectedTimeRange = computed({
  set: (val) => {
    emit("input", val);
  },
  get: () => {
    return props.value;
  },
});

const pageInfo = ref(cloneDeep(DefaultDealerPageInfo));
const dealerByApiRecord = ref<any[]>([]);

const boardData = ref<IHousekeeperVehicleNumberData>({
  total: 0,
});
const dealerTabList = ref<IDealerInfo[]>([]); // 服务中心Tab List
const loading = ref(false);
const activeTabDealerCode = ref(""); // 当前选中的服务中心Tab
const store = useStore();
// store 中存储的服务中心code
const activeStoreDealer = computed(() => {
  return store.state.orderBoard?.activeDealer?.[props.activeTab];
});

const setActiveDealerCode = (dealerInfo: IDealerInfo) => {
  // 如果在服务中心列表中没有发现activeDealer
  const index = dealerTabList.value.findIndex(
    (item) => item.dealerCode === activeStoreDealer.value
  );
  if (
    index !== -1 &&
    activeStoreDealer.value &&
    activeStoreDealer.value !== "0"
  ) {
    activeTabDealerCode.value = activeStoreDealer.value;
  } else {
    activeTabDealerCode.value = dealerInfo?.dealerCode || "";
  }
};

const initGetDealerByApi = () => {
  dealerByApiRecord.value = [];
  pageInfo.value = cloneDeep(DefaultDealerPageInfo);
};
// 查询服务中心
const getDealerListByApi = async (data?: IDealerSearchQuery) => {
  const { pageSize, currentPage } = pageInfo.value;
  const options = {
    limit: pageSize, // 一次请求n条数据
    offset: (currentPage - 1) * pageSize,
    ...data,
  };
  const response = await getBatchDealerBasicInfoByApi(options);
  const { count = 0, list = [] } = response || {};
  // 处理返回的数据
  const contactArray = [...dealerByApiRecord.value, ...list];
  dealerByApiRecord.value = uniqWith(contactArray, isDealerEqual);
  const pageCount = Math.ceil(count / pageSize);
  if (currentPage >= pageCount) {
    return;
  }
  pageInfo.value.currentPage += 1;
  getDealerListByApi(data);
};

const getDealerTabInfo = async (val) => {
  // 一直服务中心code 应该不需要分页
  const options = {
    dealerCodes: val.join(","),
    limit: 500, // 一次请求n条数据
    offset: 0,
  };
  let dealerCodeInfo: IDealerData[] = [];
  try {
    const response = await getBatchDealerBasicInfoByApi(options);
    const { count = 0, list = [] } = response || {};
    if (count) {
      dealerCodeInfo = uniqWith(list, isDealerEqual);
    }
  } catch (err) {
    console.log("err: ", err);
  }
  return dealerCodeInfo;
};

// 处理有服务中心逻辑 有搜索服务中心展示服务中心
const handleHasDealerCode = async (dealerCodes) => {
  dealerTabList.value = await getDealerTabInfo(dealerCodes);
  setActiveDealerCode(dealerTabList.value[0]);
};
// 无服务中心 展示城市下所有服务中心
const handleCityAllDealer = async (cityCodes: string[]) => {
  const options = {
    serviceCities: cityCodes.join(","),
  };
  initGetDealerByApi();
  await getDealerListByApi(options);
  dealerTabList.value = dealerByApiRecord.value;
  setActiveDealerCode(dealerTabList.value[0]);
};

// 总部展示所有服务中心
const handleIsAllRegionsDealerCode = async () => {
  initGetDealerByApi();
  await getDealerListByApi();
  dealerTabList.value = dealerByApiRecord.value;
  setActiveDealerCode(dealerTabList.value[0]);
};

// 处理服务中心逻辑
const getActiveDealerCode = () => {
  const { dealerCodes = [], cityCodes = [] } = cloneDeep(props.searchParams);
  // 有搜索的服务中心 展示服务中心
  if (dealerCodes.length) {
    handleHasDealerCode(dealerCodes);
    return;
  }
  // 总部 展示所有服务中心
  if (props.isAllRegions && !cityCodes.length) {
    handleIsAllRegionsDealerCode();
    return;
  }
  // 无服务中心 展示城市下所有服务中心
  handleCityAllDealer(cityCodes);
};

const onSearch = () => {
  if (!activeTabDealerCode.value || activeTabDealerCode.value == "0") return;
  // 保存服务单看板不同视图当前选中的服务中心
  store.commit("setOrderBoardActiveDealer", activeTabDealerCode.value);
  // 保存服务单看板不同视图当前选中的时间
  store.commit("setOrderBoardHouseKeeperTimeRange", selectedTimeRange.value);
  loading.value = true;
  const options = {
    selectedTimeRange: selectedTimeRange.value,
    dealerCodes: [activeTabDealerCode.value],
    brandList: props.searchParams?.brandList,
  };
  const query = handleSearchQuery(options);
  delete query.cityCodes;
  transformersClient
    .getBoardRepresentativePickup(query)
    .then((res) => {
      boardData.value = res;
    })
    .catch((err) => {
      boardData.value = {
        total: 0,
      };
    })
    .finally(() => {
      loading.value = false;
    });
};

const debounceSearch = debounce(onSearch, 500);

const debounceGetActiveDealerCode = debounce(getActiveDealerCode, 500);

watch(
  () => props.isAllRegions,
  () => {
    debounceGetActiveDealerCode();
  }
);

watch(
  () => activeTabDealerCode.value,
  (val) => {
    if (val == "0") return;
    if (!val) return;
    debounceSearch();
  }
);

watch(
  () => selectedTimeRange.value,
  (val, oldVal) => {
    if (isEqual(val, oldVal)) return;
    debounceSearch();
  },
  {
    deep: true,
  }
);
watch(
  () => ({
    dealerCodes: props.searchParams.dealerCodes,
    cityCodes: props.searchParams.cityCodes,
  }),
  (newVal, oldVal?: any) => {
    const cityCodeChange = isEqual(newVal.cityCodes, oldVal?.cityCodes);
    const dealerCodeChange = isEqual(newVal.dealerCodes, oldVal?.dealerCodes);
    if (!cityCodeChange || !dealerCodeChange) {
      debounceGetActiveDealerCode();
    }
  },
  { deep: true, immediate: true }
);

defineExpose({
  onSearch,
});
</script>

<style lang="scss" type="text/css" scoped>
.h-section {
  font-family: "Blue Sky Noto";
  &__echarts {
    .no-data {
      padding-top: 32px;
    }
  }
  &__tab {
    margin-top: 8px;
    margin-bottom: 32px;
    border-bottom: 1px solid #e9eaec;
    ::v-deep(.el-tabs__header) {
      margin: 0;
      .el-tabs__active-bar {
        border-radius: 5px 5px 0 0;
      }
      .el-tabs__nav-wrap {
        padding: 0 48px 0 0;
      }
      .el-tabs__nav-next,
      .el-tabs__nav-prev {
        font-size: 20px;
        bottom: 9px;
      }
      .el-tabs__nav-prev {
        left: auto;
        right: 24px;
      }
      .el-tabs__nav {
        padding-bottom: 20px;
        .el-tabs__item {
          color: #73757a;
          font-size: 14px;
          line-height: 22px;
          height: 22px;
          &.is-active {
            font-weight: 600;
            color: #242629;
          }
        }
      }
    }
  }
}
</style>
