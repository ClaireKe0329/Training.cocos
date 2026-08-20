import { SymbolType } from './SymbolType';

// 保存單局 Spin 的盤面結果
export class SpinResultData
{
    public SlotGrids: SymbolType[][];

    public constructor( slotGrids: SymbolType[][] )
    {
        this.SlotGrids = slotGrids.map( ( reelSymbols: SymbolType[] ): SymbolType[] => [ ...reelSymbols ] );
    }
}
