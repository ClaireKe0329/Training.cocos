import { SpinResultData } from '../GameData/SpinResultData';
import { SYMBOL_TYPE_LIST, SymbolType } from '../GameData/SymbolType';
import { GameUtility } from '../GameUtility/GameUtility';

// 定義單局 Spin Result 的取得方式
export interface ISpinResultProvider
{
    GetSpinResult(): SpinResultData;
}

// 提供本機 Spin Result
export class LocalSpinResultProvider implements ISpinResultProvider
{
    public GetSpinResult(): SpinResultData
    {
        const slotGrids: SymbolType[][] = [];

        for ( let columnIndex: number = 0; columnIndex < GameUtility.GetSlotColumnCount(); columnIndex++ )
        {
            const reelSymbols: SymbolType[] = [];

            for ( let rowIndex: number = 0; rowIndex < GameUtility.GetSlotRowCount(); rowIndex++ )
            {
                reelSymbols.push( this.getRandomSymbol() );
            }

            slotGrids.push( reelSymbols );
        }

        return new SpinResultData( slotGrids );
    }

    // 隨機取得一個有效的 SymbolType
    private getRandomSymbol(): SymbolType
    {
        const randomIndex: number = Math.floor( Math.random() * SYMBOL_TYPE_LIST.length );
        return SYMBOL_TYPE_LIST[ randomIndex ];
    }
}
