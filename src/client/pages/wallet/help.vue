<template>
	<MkFolder>
		<template #header><Fa :icon="faBtc"/> CryptoWallet Overview</template>

    <div style="text-align: center;">
			<div style="font-size: 1.15em;">
				OHM Wallet Help
			</div>
      <div>

      </div>
    </div>

	</MkFolder>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { faBtc } from '@fortawesome/free-brands-svg-icons';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import * as os from '@client/os';

export default defineComponent({
  components: {
  },


  props: {

  },

  data() {
    return {
			faBtc,
    };
  },

  created() {
    this.fetch();
  },

  methods: {

    fetch() {

    },

  }

});
</script>

<style lang="scss" scoped>

.monospace {
  font-family: Lucida Console, Courier, monospace;
}

</style>
