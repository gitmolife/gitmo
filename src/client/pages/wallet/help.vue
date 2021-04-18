<template>
    <div style="text-align: center;">
			<div style="font-size: 1.15em;">
				OHM Wallet Help
			</div>
      <div>

      </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import * as os from '@client/os';

  components: {
  },


  props: {

  },

  data() {
    return {

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
